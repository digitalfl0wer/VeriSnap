import type { Address, LaunchSnapshot, SnapshotField, VerifySnapshotResult } from "@verisnap/core";
import { canonicalizeSnapshot, hashSnapshot, verifySnapshot } from "@verisnap/core";
import {
  checkContractExists,
  detectProxySlots,
  fetchBaseScanSource,
  mergeVerificationFields,
  readERC20Fields,
  checkSourcifyVerification,
  toBaseScanVerificationFields,
  toSourcifyVerificationFields,
} from "@verisnap/analyzer";
import {
  createSupabaseRestClient,
  getLatestPublishedSnapshot,
  getLastWatchRun,
  getProjectByContract,
  getProjectBySlug,
  getSnapshotByVersion,
  getSnapshotByVersionAdmin,
  getWatcherByUnsubscribeToken,
  getWatcherByVerificationToken,
  insertDiff,
  insertWatchRun,
  insertWatcher,
  listProjectsForWatch,
  listVerifiedWatchers,
  publishSnapshot,
  setWatcherStatus,
  updateProjectLatestSnapshot,
  updateWatchRun,
  upsertDraftSnapshot,
  upsertProject,
} from "@verisnap/db";

export type WorkerEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  baseRpcUrl: string;
  baseChainId: number;
  basescanApiKey?: string;
  enableBaseScan?: boolean;
  pinataJwt?: string;
  resendApiKey?: string;
  appBaseUrl?: string;
  fromEmail?: string;
};

export type DraftResult = {
  project: Awaited<ReturnType<typeof upsertProject>>;
  snapshot: Awaited<ReturnType<typeof upsertDraftSnapshot>>;
  canonicalSnapshot: LaunchSnapshot;
  watchFields: Record<string, unknown>;
};

export type PublishResult = {
  projectId: string;
  snapshotId: string;
  version: number;
  canonicalHash: string;
  ipfsCid?: string | null;
  links: {
    latest?: string;
    version?: string;
  };
};

export function createWorker(env: WorkerEnv) {
  const db = createSupabaseRestClient({
    supabaseUrl: env.supabaseUrl,
    anonKey: env.supabaseAnonKey,
    serviceRoleKey: env.supabaseServiceRoleKey,
  });

  async function analyzeContract(contractAddress: Address) {
    const now = new Date().toISOString();
    const existsField = await checkContractExists({ rpcUrl: env.baseRpcUrl, chainId: env.baseChainId }, contractAddress);
    if (!existsField.value) {
      throw new Error("No contract code found at address");
    }

    const [erc20, proxy] = await Promise.all([
      readERC20Fields({ rpcUrl: env.baseRpcUrl, chainId: env.baseChainId }, contractAddress),
      detectProxySlots({ rpcUrl: env.baseRpcUrl, chainId: env.baseChainId }, contractAddress),
    ]);

    const basescanFields =
      env.enableBaseScan && env.basescanApiKey
        ? toBaseScanVerificationFields(
            await fetchBaseScanSource({
              contractAddress,
              config: { apiKey: env.basescanApiKey },
            })
          )
        : undefined;

    const sourcifyResult = await checkSourcifyVerification({
      chainId: env.baseChainId,
      contractAddress,
      config: {},
    });
    const sourcifyFields = toSourcifyVerificationFields(sourcifyResult);

    const merged = mergeVerificationFields({ basescan: basescanFields, sourcify: sourcifyFields });

    const isProxy = proxy.implementation.value !== null;
    const snapshot: LaunchSnapshot = {
      chainId: env.baseChainId,
      contractAddress,
      observedAt: now,
      token: {
        name: erc20.name,
        symbol: erc20.symbol,
        decimals: erc20.decimals,
        totalSupply: erc20.totalSupply,
      },
      verification: merged.verification,
      proxy: {
        isProxy: {
          value: isProxy,
          status: "yes",
          provenance: "derived",
          evidence: { implementation: proxy.implementation.value },
        },
        implementation: proxy.implementation,
        admin: proxy.admin,
      },
      derived: deriveFlags({ proxy, verification: merged.verification }),
    };

    const canonicalHash = hashSnapshot(snapshot);
    const canonicalJson = JSON.parse(canonicalizeSnapshot(snapshot)) as unknown;
    const watchFields = extractWatchFields(snapshot);

    return { snapshot, canonicalHash, canonicalJson, watchFields, explorerEvidence: merged.evidence };
  }

  async function generateDraft({
    contractAddress,
    slug,
    name,
    builderLinks,
  }: {
    contractAddress: Address;
    slug?: string;
    name?: string;
    builderLinks?: { label: string; url: string }[];
  }): Promise<DraftResult> {
    const analyzed = await analyzeContract(contractAddress);
    const snapshot = analyzed.snapshot;
    const canonicalHash = analyzed.canonicalHash;
    const canonicalJson = analyzed.canonicalJson;

    const projectSlug = slug?.trim() || defaultSlug(contractAddress);
    const projectName = name?.trim() || inferName(snapshot) || "LaunchReceipt Project";

    const existing = await getProjectByContract(db, contractAddress);
    const latestPublished = existing ? await getLatestPublishedSnapshot(db, existing.id) : null;
    const nextVersion = (latestPublished?.version ?? 0) + 1;

    const watchFields = analyzed.watchFields;

    const project = await upsertProject(db, {
      slug: projectSlug,
      name: projectName,
      contract_address: contractAddress,
      network: "base",
      watch_enabled: true,
      watch_fields: watchFields,
      metadata: {
        ...(existing?.metadata ?? {}),
        mergedExplorerEvidence: analyzed.explorerEvidence,
        builderLinks: builderLinks ?? [],
      },
      latest_snapshot_id: existing?.latest_snapshot_id ?? null,
    });
    if (!project) throw new Error("Failed to upsert project");

    const draftSnapshot = await upsertDraftSnapshot(db, {
      project_id: project.id,
      version: nextVersion,
      canonical_json: canonicalJson,
      canonical_hash: canonicalHash,
      provenance: {},
      metadata: { builderLinks: builderLinks ?? [] },
    });
    if (!draftSnapshot) throw new Error("Failed to upsert draft snapshot");

    return { project, snapshot: draftSnapshot, canonicalSnapshot: snapshot, watchFields };
  }

  async function publishDraft({
    slug,
    version,
  }: {
    slug: string;
    version: number;
  }): Promise<PublishResult> {
    const project = await getProjectBySlug(db, slug);
    if (!project) throw new Error("Unknown project");

    const snapshotRow = await getSnapshotByVersionAdmin(db, project.id, version);
    if (!snapshotRow) throw new Error("Unknown snapshot version");
    if (snapshotRow.state !== "draft") throw new Error("Snapshot is not a draft");

    const canonicalSnapshot = snapshotRow.canonical_json as LaunchSnapshot;
    const canonicalHash = hashSnapshot(canonicalSnapshot);

    const ipfsCid = await maybePinToIpfs(canonicalSnapshot, env.pinataJwt);
    const pinnedAt = ipfsCid ? new Date().toISOString() : null;

    const published = await publishSnapshot(db, snapshotRow.id, {
      canonical_hash: canonicalHash,
      ipfs_cid: ipfsCid ?? null,
      pinned_at: pinnedAt,
    });
    if (!published) throw new Error("Failed to publish snapshot");

    await updateProjectLatestSnapshot(db, project.id, published.id);

    const prev = await getSnapshotByVersion(db, project.id, version - 1);
    if (prev && prev.state === "published") {
      const diff = diffSnapshots(prev.canonical_json, published.canonical_json);
      await insertDiff(db, {
        project_id: project.id,
        snapshot_id: published.id,
        previous_snapshot_id: prev.id,
        diff,
        metadata: {},
      });
    }

    const links = buildLinks(env.appBaseUrl, project.slug, version);

    return {
      projectId: project.id,
      snapshotId: published.id,
      version: published.version,
      canonicalHash: published.canonical_hash,
      ipfsCid: published.ipfs_cid,
      links,
    };
  }

  async function verifyPublishedSnapshot({ slug, version }: { slug: string; version: number }): Promise<VerifySnapshotResult> {
    const project = await getProjectBySlug(db, slug);
    if (!project) throw new Error("Unknown project");
    const snapshotRow = await getSnapshotByVersion(db, project.id, version);
    if (!snapshotRow) throw new Error("Unknown snapshot");
    return verifySnapshot(snapshotRow.canonical_json as LaunchSnapshot, snapshotRow.canonical_hash);
  }

  async function subscribeWatcher({
    projectSlug,
    email,
  }: {
    projectSlug: string;
    email: string;
  }) {
    const project = await getProjectBySlug(db, projectSlug);
    if (!project) throw new Error("Unknown project");

    const verificationToken = randomToken();
    const unsubscribeToken = randomToken();
    const emailNormalized = normalizeEmail(email);

    const watcher = await insertWatcher(db, {
      project_id: project.id,
      email,
      email_normalized: emailNormalized,
      status: "pending",
      verification_token: verificationToken,
      unsubscribe_token: unsubscribeToken,
      notification_plan: {},
    });
    if (!watcher) throw new Error("Failed to create watcher");

    await maybeSendVerificationEmail({
      apiKey: env.resendApiKey,
      from: env.fromEmail ?? "verisnap@example.com",
      to: watcher.email,
      projectSlug,
      verifyUrl: buildVerifyUrl(env.appBaseUrl, verificationToken),
      unsubscribeUrl: buildUnsubscribeUrl(env.appBaseUrl, unsubscribeToken),
    });

    return { ok: true };
  }

  async function verifyWatcher({ token }: { token: string }) {
    const watcher = await getWatcherByVerificationToken(db, token);
    if (!watcher) throw new Error("Invalid token");
    if (watcher.status === "verified") return { ok: true };
    await setWatcherStatus(db, watcher.id, { status: "verified", verified_at: new Date().toISOString() });
    return { ok: true };
  }

  async function unsubscribeWatcher({ token }: { token: string }) {
    const watcher = await getWatcherByUnsubscribeToken(db, token);
    if (!watcher) throw new Error("Invalid token");
    if (watcher.status === "unsubscribed") return { ok: true };
    await setWatcherStatus(db, watcher.id, { status: "unsubscribed" });
    return { ok: true };
  }

  async function pollOnce(): Promise<{ ok: boolean; checked: number; changed: number }> {
    const projects = await listProjectsForWatch(db);
    let checked = 0;
    let changed = 0;

    for (const project of projects) {
      const due = await isProjectDue(project.id, project.created_at);
      if (!due) continue;

      checked += 1;
      const didChange = await runWatchCheck(project.slug);
      if (didChange) changed += 1;
    }

    return { ok: true, checked, changed };
  }

  async function runWatchCheck(projectSlug: string): Promise<boolean> {
    const project = await getProjectBySlug(db, projectSlug);
    if (!project) throw new Error("Unknown project");

    const scheduledAt = new Date().toISOString();
    const run = await insertWatchRun(db, {
      project_id: project.id,
      scheduled_at: scheduledAt,
      status: "running",
      result: {},
    });
    if (!run) throw new Error("Failed to create watch run");

    try {
      const previous = await getLatestPublishedSnapshot(db, project.id);
      if (!previous) {
        await updateWatchRun(db, run.id, {
          executed_at: new Date().toISOString(),
          status: "error",
          error: "No published snapshot to compare against",
          result: {},
        });
        return false;
      }

      const contractAddress = project.contract_address as Address;
      const analyzed = await analyzeContract(contractAddress);
      const newSnapshot = analyzed.snapshot;
      const newHash = analyzed.canonicalHash;
      const prevWatch = extractWatchFields(previous.canonical_json);
      const nextWatch = analyzed.watchFields;

      const watchDiff = diffSnapshots(prevWatch, nextWatch);
      const hasChanges = hasAnyDiff(watchDiff);

      if (!hasChanges) {
        await updateWatchRun(db, run.id, {
          executed_at: new Date().toISOString(),
          status: "no_change",
          result: { watchDiff },
        });
        return false;
      }

      const nextVersion = previous.version + 1;
      const publishedRow = await upsertDraftSnapshot(db, {
        project_id: project.id,
        version: nextVersion,
        canonical_json: analyzed.canonicalJson,
        canonical_hash: newHash,
        provenance: {},
        metadata: { watchDiff },
      });
      if (!publishedRow) throw new Error("Failed to create snapshot");

      const published = await publishSnapshot(db, publishedRow.id, {
        canonical_hash: newHash,
        ipfs_cid: null,
        pinned_at: null,
      });
      if (!published) throw new Error("Failed to publish watch snapshot");

      await updateProjectLatestSnapshot(db, project.id, published.id);

      const diffRow = await insertDiff(db, {
        project_id: project.id,
        snapshot_id: published.id,
        previous_snapshot_id: previous.id,
        diff: diffSnapshots(previous.canonical_json, published.canonical_json),
        metadata: {},
      });

      await updateWatchRun(db, run.id, {
        executed_at: new Date().toISOString(),
        status: "success",
        snapshot_id: published.id,
        diff_id: diffRow?.id ?? null,
        result: { watchDiff },
      });

      await notifyWatchers({
        projectSlug: project.slug,
        projectName: project.name,
        version: published.version,
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await updateWatchRun(db, run.id, {
        executed_at: new Date().toISOString(),
        status: "error",
        error: message,
        result: {},
      });
      return false;
    }
  }

  async function notifyWatchers({ projectSlug, projectName, version }: { projectSlug: string; projectName: string; version: number }) {
    const project = await getProjectBySlug(db, projectSlug);
    if (!project) return;
    const watchers = await listVerifiedWatchers(db, project.id);
    if (!watchers.length) return;

    const baseUrl = env.appBaseUrl;
    const versionUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/p/${projectSlug}/v/${version}` : undefined;

    for (const watcher of watchers) {
      await maybeSendNotificationEmail({
        apiKey: env.resendApiKey,
        from: env.fromEmail ?? "verisnap@example.com",
        to: watcher.email,
        subject: `${projectName}: receipt updated to v${version}`,
        html: `<p>A new version of <b>${escapeHtml(projectName)}</b> was published: v${version}.</p>${
          versionUrl ? `<p><a href="${versionUrl}">View receipt</a></p>` : ""
        }<p>If you no longer want updates, you can unsubscribe via your original email link.</p>`,
      });
    }
  }

  async function isProjectDue(projectId: string, createdAt: string): Promise<boolean> {
    const last = await getLastWatchRun(db, projectId);
    const lastAt = last?.executed_at ? new Date(last.executed_at).getTime() : 0;
    const now = Date.now();

    const createdMs = new Date(createdAt).getTime();
    const ageDays = Math.max(0, (now - createdMs) / (1000 * 60 * 60 * 24));

    let intervalMs: number;
    if (ageDays <= 30) intervalMs = 6 * 60 * 60 * 1000;
    else if (ageDays <= 90) intervalMs = 48 * 60 * 60 * 1000;
    else if (ageDays <= 180) intervalMs = 7 * 24 * 60 * 60 * 1000;
    else intervalMs = 30 * 24 * 60 * 60 * 1000;

    const latest = await getLatestPublishedSnapshot(db, projectId);
    const riskOverride = Boolean(
      (latest?.canonical_json as LaunchSnapshot | undefined)?.derived?.riskOverride?.value ??
        (latest?.canonical_json as LaunchSnapshot | undefined)?.derived?.isUpgradeable?.value ??
        (latest?.canonical_json as LaunchSnapshot | undefined)?.derived?.hasAdminPowers?.value
    );

    if (ageDays > 180 && riskOverride) {
      intervalMs = 7 * 24 * 60 * 60 * 1000;
    }

    if (riskOverride) {
      intervalMs = Math.min(intervalMs, 48 * 60 * 60 * 1000);
    }

    if (!lastAt) return true;
    return now - lastAt >= intervalMs;
  }

  return {
    generateDraft,
    publishDraft,
    verifyPublishedSnapshot,
    subscribeWatcher,
    verifyWatcher,
    unsubscribeWatcher,
    pollOnce,
    runWatchCheck,
  };
}

function defaultSlug(contractAddress: string): string {
  const normalized = contractAddress.toLowerCase();
  return `base-${normalized.slice(2, 8)}-${normalized.slice(-4)}`;
}

function inferName(snapshot: LaunchSnapshot): string | undefined {
  const name = snapshot.token?.name?.value?.toString().trim();
  const symbol = snapshot.token?.symbol?.value?.toString().trim();
  if (name && symbol) return `${name} (${symbol})`;
  return name || symbol || undefined;
}

function deriveFlags({
  proxy,
  verification,
}: {
  proxy: { implementation: SnapshotField<Address | null>; admin: SnapshotField<Address | null> };
  verification: NonNullable<LaunchSnapshot["verification"]>;
}): LaunchSnapshot["derived"] {
  const isUpgradeable = proxy.implementation.value !== null;
  const hasAdminPowers = proxy.admin.value !== null;
  const riskOverride = isUpgradeable || hasAdminPowers || verification.isVerified?.status === "conflict";

  return {
    isUpgradeable: { value: isUpgradeable, status: "yes", provenance: "derived" },
    hasAdminPowers: { value: hasAdminPowers, status: "yes", provenance: "derived" },
    riskOverride: { value: riskOverride, status: "yes", provenance: "derived" },
  };
}

function extractWatchFields(snapshotLike: unknown): Record<string, unknown> {
  const snapshot = snapshotLike as LaunchSnapshot;
  return {
    proxyImplementation: snapshot.proxy?.implementation?.value ?? null,
    proxyAdmin: snapshot.proxy?.admin?.value ?? null,
    totalSupply: snapshot.token?.totalSupply?.value ?? null,
    isVerified: snapshot.verification?.isVerified?.value ?? null,
    abiAvailable: snapshot.verification?.abiAvailable?.value ?? null,
    sourceAvailable: snapshot.verification?.sourceAvailable?.value ?? null,
  };
}

function diffSnapshots(previous: unknown, next: unknown): unknown {
  const changes: Array<{ path: string; before: unknown; after: unknown }> = [];

  function walk(path: string, a: unknown, b: unknown) {
    if (Object.is(a, b)) return;

    const aIsObj = a !== null && typeof a === "object";
    const bIsObj = b !== null && typeof b === "object";

    if (Array.isArray(a) && Array.isArray(b)) {
      const len = Math.max(a.length, b.length);
      for (let i = 0; i < len; i++) walk(`${path}[${i}]`, a[i], b[i]);
      return;
    }

    if (aIsObj && bIsObj && !Array.isArray(a) && !Array.isArray(b)) {
      const keys = new Set([...Object.keys(a as Record<string, unknown>), ...Object.keys(b as Record<string, unknown>)]);
      for (const key of Array.from(keys).sort()) {
        walk(path ? `${path}.${key}` : key, (a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]);
      }
      return;
    }

    changes.push({ path, before: a, after: b });
  }

  walk("", previous, next);
  return { changes };
}

function hasAnyDiff(diff: unknown): boolean {
  const obj = diff as { changes?: unknown[] };
  return Array.isArray(obj.changes) && obj.changes.length > 0;
}

async function maybePinToIpfs(snapshot: LaunchSnapshot, pinataJwt?: string): Promise<string | null> {
  if (!pinataJwt) return null;

  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      authorization: `Bearer ${pinataJwt}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: snapshot,
      pinataMetadata: { name: `verisnap-${snapshot.contractAddress}-${snapshot.observedAt}` },
    }),
  });

  if (!response.ok) return null;
  const json = (await response.json()) as { IpfsHash?: string };
  return json.IpfsHash ?? null;
}

async function maybeSendVerificationEmail(args: {
  apiKey?: string;
  from: string;
  to: string;
  projectSlug: string;
  verifyUrl?: string;
  unsubscribeUrl?: string;
}) {
  if (!args.apiKey || !args.verifyUrl || !args.unsubscribeUrl) return;

  const subject = `Verify Watch Mode for ${args.projectSlug}`;
  const html = `<p>Confirm your subscription for <b>${escapeHtml(args.projectSlug)}</b>.</p>
<p><a href="${args.verifyUrl}">Verify email</a></p>
<p>If you didn’t request this, ignore this email.</p>
<p><a href="${args.unsubscribeUrl}">Unsubscribe</a></p>`;

  await resendSend({ apiKey: args.apiKey, from: args.from, to: args.to, subject, html });
}

async function maybeSendNotificationEmail(args: {
  apiKey?: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  if (!args.apiKey) return;
  await resendSend({
    apiKey: args.apiKey,
    from: args.from,
    to: args.to,
    subject: args.subject,
    html: args.html,
  });
}

async function resendSend(args: { apiKey: string; from: string; to: string; subject: string; html: string }) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${args.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: args.from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
    }),
  }).catch(() => undefined);
}

function buildLinks(baseUrl: string | undefined, slug: string, version: number) {
  if (!baseUrl) return {};
  const base = baseUrl.replace(/\/$/, "");
  return {
    latest: `${base}/p/${slug}`,
    version: `${base}/p/${slug}/v/${version}`,
  };
}

function buildVerifyUrl(baseUrl: string | undefined, token: string) {
  if (!baseUrl) return undefined;
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/api/watch/verify?token=${encodeURIComponent(token)}`;
}

function buildUnsubscribeUrl(baseUrl: string | undefined, token: string) {
  if (!baseUrl) return undefined;
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/api/watch/unsubscribe?token=${encodeURIComponent(token)}`;
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#039;";
      default:
        return ch;
    }
  });
}

export * from "./receipt";
export * from "./signature";
