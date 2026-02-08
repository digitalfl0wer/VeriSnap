export type SupabaseAuthMode = "anon" | "service";

export type SupabaseRestConfig = {
  supabaseUrl: string;
  anonKey?: string;
  serviceRoleKey?: string;
};

export type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  contract_address: string;
  network: string;
  watch_enabled: boolean;
  watch_fields: unknown;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  latest_snapshot_id?: string | null;
};

export type SnapshotRow = {
  id: string;
  project_id: string;
  version: number;
  canonical_json: unknown;
  canonical_hash: string;
  state: "draft" | "published";
  ipfs_cid: string | null;
  pinned_at: string | null;
  provenance: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DiffRow = {
  id: string;
  project_id: string;
  snapshot_id: string;
  previous_snapshot_id: string | null;
  diff: unknown;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type WatcherRow = {
  id: string;
  project_id: string;
  email: string;
  email_normalized: string;
  status: "pending" | "verified" | "unsubscribed";
  verification_token: string;
  verification_sent_at: string;
  verified_at: string | null;
  unsubscribe_token: string;
  notification_plan: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type WatchRunRow = {
  id: string;
  project_id: string;
  scheduled_at: string;
  executed_at: string | null;
  status: "pending" | "running" | "success" | "no_change" | "error";
  snapshot_id: string | null;
  diff_id: string | null;
  result: Record<string, unknown>;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export function createSupabaseRestClient(config: SupabaseRestConfig) {
  const base = config.supabaseUrl.replace(/\/$/, "");

  async function request<T>({
    mode,
    path,
    method = "GET",
    query,
    headers,
    body,
  }: {
    mode: SupabaseAuthMode;
    path: string;
    method?: string;
    query?: Record<string, string | number | boolean | undefined>;
    headers?: Record<string, string>;
    body?: unknown;
  }): Promise<T> {
    const key = mode === "service" ? config.serviceRoleKey : config.anonKey;
    if (!key) throw new Error(`Missing Supabase key for mode=${mode}`);

    const url = new URL(`${base}${path.startsWith("/") ? "" : "/"}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined) continue;
        url.searchParams.set(k, String(v));
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Supabase REST ${method} ${path} failed (${response.status}): ${text}`);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return { request };
}

export async function getProjectBySlug(client: ReturnType<typeof createSupabaseRestClient>, slug: string) {
  const rows = await client.request<ProjectRow[]>({
    mode: "anon",
    path: "/rest/v1/projects",
    query: { slug: `eq.${slug}`, select: "*" },
    headers: { accept: "application/json" },
  });
  return rows[0] ?? null;
}

export async function getProjectByContract(
  client: ReturnType<typeof createSupabaseRestClient>,
  contractAddress: string
) {
  const rows = await client.request<ProjectRow[]>({
    mode: "anon",
    path: "/rest/v1/projects",
    query: { contract_address: `eq.${contractAddress}`, select: "*" },
    headers: { accept: "application/json" },
  });
  return rows[0] ?? null;
}

export async function upsertProject(
  client: ReturnType<typeof createSupabaseRestClient>,
  project: Pick<ProjectRow, "slug" | "name" | "contract_address" | "network" | "watch_enabled" | "watch_fields" | "metadata"> & {
    latest_snapshot_id?: string | null;
  }
) {
  const rows = await client.request<ProjectRow[]>({
    mode: "service",
    path: "/rest/v1/projects",
    method: "POST",
    query: { on_conflict: "contract_address" },
    headers: {
      prefer: "resolution=merge-duplicates,return=representation",
    },
    body: project,
  });
  return rows[0] ?? null;
}

export async function listPublishedSnapshots(
  client: ReturnType<typeof createSupabaseRestClient>,
  projectId: string
) {
  return client.request<SnapshotRow[]>({
    mode: "anon",
    path: "/rest/v1/snapshots",
    query: {
      project_id: `eq.${projectId}`,
      state: "eq.published",
      order: "version.desc",
      select: "*",
    },
  });
}

export async function getSnapshotByVersion(
  client: ReturnType<typeof createSupabaseRestClient>,
  projectId: string,
  version: number
) {
  const rows = await client.request<SnapshotRow[]>({
    mode: "anon",
    path: "/rest/v1/snapshots",
    query: { project_id: `eq.${projectId}`, version: `eq.${version}`, select: "*" },
  });
  return rows[0] ?? null;
}

export async function getSnapshotByVersionAdmin(
  client: ReturnType<typeof createSupabaseRestClient>,
  projectId: string,
  version: number
) {
  const rows = await client.request<SnapshotRow[]>({
    mode: "service",
    path: "/rest/v1/snapshots",
    query: { project_id: `eq.${projectId}`, version: `eq.${version}`, select: "*" },
  });
  return rows[0] ?? null;
}

export async function getLatestPublishedSnapshot(
  client: ReturnType<typeof createSupabaseRestClient>,
  projectId: string
) {
  const rows = await client.request<SnapshotRow[]>({
    mode: "anon",
    path: "/rest/v1/snapshots",
    query: {
      project_id: `eq.${projectId}`,
      state: "eq.published",
      order: "version.desc",
      limit: 1,
      select: "*",
    },
  });
  return rows[0] ?? null;
}

export async function upsertDraftSnapshot(
  client: ReturnType<typeof createSupabaseRestClient>,
  draft: Pick<SnapshotRow, "project_id" | "version" | "canonical_json" | "canonical_hash" | "provenance" | "metadata"> & {
    ipfs_cid?: string | null;
    pinned_at?: string | null;
  }
) {
  const rows = await client.request<SnapshotRow[]>({
    mode: "service",
    path: "/rest/v1/snapshots",
    method: "POST",
    query: { on_conflict: "project_id,version" },
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: {
      ...draft,
      state: "draft",
      ipfs_cid: draft.ipfs_cid ?? null,
      pinned_at: draft.pinned_at ?? null,
    },
  });
  return rows[0] ?? null;
}

export async function publishSnapshot(
  client: ReturnType<typeof createSupabaseRestClient>,
  snapshotId: string,
  patch: Pick<SnapshotRow, "canonical_hash"> & { ipfs_cid?: string | null; pinned_at?: string | null }
) {
  const rows = await client.request<SnapshotRow[]>({
    mode: "service",
    path: "/rest/v1/snapshots",
    method: "PATCH",
    query: { id: `eq.${snapshotId}`, select: "*" },
    headers: { prefer: "return=representation" },
    body: {
      state: "published",
      canonical_hash: patch.canonical_hash,
      ipfs_cid: patch.ipfs_cid ?? null,
      pinned_at: patch.pinned_at ?? null,
      updated_at: new Date().toISOString(),
    },
  });
  return rows[0] ?? null;
}

export async function updateProjectLatestSnapshot(
  client: ReturnType<typeof createSupabaseRestClient>,
  projectId: string,
  latestSnapshotId: string
) {
  const rows = await client.request<ProjectRow[]>({
    mode: "service",
    path: "/rest/v1/projects",
    method: "PATCH",
    query: { id: `eq.${projectId}`, select: "*" },
    headers: { prefer: "return=representation" },
    body: { latest_snapshot_id: latestSnapshotId },
  });
  return rows[0] ?? null;
}

export async function insertDiff(
  client: ReturnType<typeof createSupabaseRestClient>,
  diff: Pick<DiffRow, "project_id" | "snapshot_id" | "previous_snapshot_id" | "diff" | "metadata">
) {
  const rows = await client.request<DiffRow[]>({
    mode: "service",
    path: "/rest/v1/diffs",
    method: "POST",
    headers: { prefer: "return=representation" },
    body: diff,
  });
  return rows[0] ?? null;
}

export async function insertWatcher(
  client: ReturnType<typeof createSupabaseRestClient>,
  watcher: Pick<
    WatcherRow,
    "project_id" | "email" | "email_normalized" | "status" | "verification_token" | "unsubscribe_token" | "notification_plan"
  >
) {
  const rows = await client.request<WatcherRow[]>({
    mode: "service",
    path: "/rest/v1/watchers",
    method: "POST",
    query: { on_conflict: "project_id,email_normalized" },
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: watcher,
  });
  return rows[0] ?? null;
}

export async function getWatcherByVerificationToken(
  client: ReturnType<typeof createSupabaseRestClient>,
  token: string
) {
  const rows = await client.request<WatcherRow[]>({
    mode: "service",
    path: "/rest/v1/watchers",
    query: { verification_token: `eq.${token}`, select: "*" },
  });
  return rows[0] ?? null;
}

export async function getWatcherByUnsubscribeToken(
  client: ReturnType<typeof createSupabaseRestClient>,
  token: string
) {
  const rows = await client.request<WatcherRow[]>({
    mode: "service",
    path: "/rest/v1/watchers",
    query: { unsubscribe_token: `eq.${token}`, select: "*" },
  });
  return rows[0] ?? null;
}

export async function setWatcherStatus(
  client: ReturnType<typeof createSupabaseRestClient>,
  watcherId: string,
  patch: Partial<Pick<WatcherRow, "status" | "verified_at">>
) {
  const rows = await client.request<WatcherRow[]>({
    mode: "service",
    path: "/rest/v1/watchers",
    method: "PATCH",
    query: { id: `eq.${watcherId}`, select: "*" },
    headers: { prefer: "return=representation" },
    body: patch,
  });
  return rows[0] ?? null;
}

export async function listVerifiedWatchers(client: ReturnType<typeof createSupabaseRestClient>, projectId: string) {
  return client.request<WatcherRow[]>({
    mode: "service",
    path: "/rest/v1/watchers",
    query: { project_id: `eq.${projectId}`, status: "eq.verified", select: "*" },
  });
}

export async function insertWatchRun(
  client: ReturnType<typeof createSupabaseRestClient>,
  run: Pick<WatchRunRow, "project_id" | "scheduled_at" | "status" | "result">
) {
  const rows = await client.request<WatchRunRow[]>({
    mode: "service",
    path: "/rest/v1/watch_runs",
    method: "POST",
    headers: { prefer: "return=representation" },
    body: run,
  });
  return rows[0] ?? null;
}

export async function updateWatchRun(
  client: ReturnType<typeof createSupabaseRestClient>,
  runId: string,
  patch: Partial<Pick<WatchRunRow, "executed_at" | "status" | "snapshot_id" | "diff_id" | "result" | "error">>
) {
  const rows = await client.request<WatchRunRow[]>({
    mode: "service",
    path: "/rest/v1/watch_runs",
    method: "PATCH",
    query: { id: `eq.${runId}`, select: "*" },
    headers: { prefer: "return=representation" },
    body: patch,
  });
  return rows[0] ?? null;
}

export async function listProjectsForWatch(client: ReturnType<typeof createSupabaseRestClient>) {
  return client.request<ProjectRow[]>({
    mode: "service",
    path: "/rest/v1/projects",
    query: { watch_enabled: "eq.true", select: "*" },
  });
}

export async function getLastWatchRun(client: ReturnType<typeof createSupabaseRestClient>, projectId: string) {
  const rows = await client.request<WatchRunRow[]>({
    mode: "service",
    path: "/rest/v1/watch_runs",
    query: { project_id: `eq.${projectId}`, order: "scheduled_at.desc", limit: 1, select: "*" },
  });
  return rows[0] ?? null;
}
