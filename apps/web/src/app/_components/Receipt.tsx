"use client";

import type { LaunchSnapshot } from "@verisnap/core";
import { useMemo, useState } from "react";

import { basescanAddressUrl, blockscoutAddressUrl } from "@/lib/explorers";

type Props = {
  project: { slug: string; name: string };
  snapshot: {
    version: number;
    state: "draft" | "published";
    canonical_hash: string;
    ipfs_cid: string | null;
    created_at: string;
    canonical_json: unknown;
    metadata?: Record<string, unknown>;
  };
};

type StatusMeta = {
  icon: string;
  label: string;
  color: string;
  description: string;
};

const statusMeta = {
  yes: { icon: "✅", label: "Yes", color: "text-emerald-300", description: "Confirmed" },
  no: { icon: "❌", label: "No", color: "text-rose-300", description: "Not present" },
  unknown: { icon: "❔", label: "Unknown", color: "text-sky-300", description: "Insufficient evidence" },
  conflict: { icon: "⚠️", label: "Conflict", color: "text-amber-300", description: "Sources disagree" },
} as const satisfies Record<"yes" | "no" | "unknown" | "conflict", StatusMeta>;

export default function Receipt({ project, snapshot }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);

  const canonical = snapshot.canonical_json as LaunchSnapshot;

  const lineItems = useMemo(() => {
    const token = canonical.token ?? {};
    const proxy = canonical.proxy ?? {};
    const verification = canonical.verification ?? {};
    return [
      {
        id: "token",
        label: "Token",
        value: token.name?.value ? `${token.name.value} (${token.symbol?.value ?? "?"})` : token.symbol?.value ?? "Unknown",
        status: token.name?.status ?? token.symbol?.status ?? "unknown",
        detail: canonical.contractAddress,
      },
      {
        id: "supply",
        label: "Total supply",
        value: token.totalSupply?.value ?? "Unknown",
        status: token.totalSupply?.status ?? "unknown",
        detail: token.decimals?.value !== undefined ? `Decimals: ${token.decimals.value}` : "Decimals unknown",
      },
      {
        id: "proxy",
        label: "Upgradeable proxy",
        value: proxy.isProxy?.value ? "Proxy detected" : "No proxy evidence",
        status: proxy.isProxy?.value ? "yes" : proxy.isProxy?.status ?? "unknown",
        detail: proxy.implementation?.value ? `Impl: ${proxy.implementation.value}` : "Impl unknown",
      },
      {
        id: "admin",
        label: "Proxy admin",
        value: proxy.admin?.value ? proxy.admin.value : "None detected",
        status: proxy.admin?.value ? "yes" : proxy.admin?.status ?? "unknown",
        detail: proxy.admin?.provenance ? `Provenance: ${proxy.admin.provenance}` : "",
      },
      {
        id: "verify",
        label: "Explorer verification",
        value: verification.isVerified?.value ? "Verified" : "Not verified",
        status: verification.isVerified?.status ?? "unknown",
        detail: `ABI: ${String(verification.abiAvailable?.value ?? "unknown")} · Source: ${String(
          verification.sourceAvailable?.value ?? "unknown"
        )}`,
      },
    ] as const;
  }, [canonical]);

  const onCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${label} copied`);
      setTimeout(() => setCopyStatus(null), 1500);
    } catch {
      setCopyStatus("Copy failed");
      setTimeout(() => setCopyStatus(null), 1500);
    }
  };

  const onShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${project.name} — LaunchReceipt`, url });
        return;
      }
    } catch {
      // fall through to copy
    }
    await onCopy(url, "Link");
  };

  const onVerify = async () => {
    setVerifyResult(null);
    const res = await fetch(`/api/verify?slug=${encodeURIComponent(project.slug)}&version=${snapshot.version}`);
    const json = (await res.json()) as any;
    setVerifyResult(json);
  };

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 print:border-none print:bg-white print:text-black">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Receipt</p>
          <h2 className="text-xl font-semibold text-white print:text-black">{project.name}</h2>
          <p className="text-xs text-zinc-400 print:text-zinc-600">
            v{snapshot.version} · {new Date(snapshot.created_at).toUTCString()} · {snapshot.state}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowRaw(false)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              showRaw ? "border-zinc-700 text-zinc-400" : "border-emerald-400 text-emerald-200"
            }`}
          >
            Plain language
          </button>
          <button
            onClick={() => setShowRaw(true)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              showRaw ? "border-emerald-400 text-emerald-200" : "border-zinc-700 text-zinc-400"
            }`}
          >
            Raw proof view
          </button>
          <button
            onClick={onShare}
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500 print:hidden"
          >
            Share
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500 print:hidden"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {lineItems.map((item) => {
          const meta = getStatusMeta(item.status);
          const context = getLineItemContext(item.id, canonical);
          return (
            <article
              key={item.id}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 print:border-zinc-300 print:bg-white"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{item.label}</p>
                <p className="mt-1 text-lg font-semibold text-white print:text-black">{item.value}</p>
                {context.primary ? <p className="mt-1 text-xs text-zinc-400 print:text-zinc-600">{context.primary}</p> : null}
                {context.secondary ? <p className="mt-1 text-xs text-zinc-500 print:text-zinc-600">{context.secondary}</p> : null}
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <p className="text-zinc-400 print:text-zinc-600">{item.detail}</p>
                <span className={`flex items-center gap-1 text-[0.7rem] font-semibold ${meta.color}`}>
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 print:border-zinc-300 print:bg-white">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Contract address</p>
        <p className="mt-2 break-all font-mono text-xs text-zinc-200 print:text-black">{canonical.contractAddress}</p>
        <div className="mt-3 flex flex-wrap gap-2 print:hidden">
          <button
            onClick={() => onCopy(canonical.contractAddress, "Address")}
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
          >
            Copy address
          </button>
          <a
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
            href={basescanAddressUrl(canonical.contractAddress)}
            target="_blank"
            rel="noreferrer"
          >
            BaseScan
          </a>
          <a
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
            href={blockscoutAddressUrl(canonical.contractAddress)}
            target="_blank"
            rel="noreferrer"
          >
            Blockscout
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 print:border-zinc-300 print:bg-white">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Snapshot hash</p>
            <p className="break-all font-mono text-xs text-zinc-200 print:text-black">{snapshot.canonical_hash}</p>
            <button
              onClick={() => onCopy(snapshot.canonical_hash, "Hash")}
              className="mt-2 rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500 print:hidden"
            >
              Copy hash
            </button>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">IPFS CID</p>
            <p className="break-all font-mono text-xs text-zinc-200 print:text-black">{snapshot.ipfs_cid ?? "Not pinned"}</p>
            {snapshot.ipfs_cid ? (
              <button
                onClick={() => onCopy(snapshot.ipfs_cid ?? "", "CID")}
                className="mt-2 rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500 print:hidden"
              >
                Copy CID
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex flex-wrap gap-2">
            <a
              href={`/p/${project.slug}`}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
            >
              Latest
            </a>
            <a
              href={`/p/${project.slug}/history`}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
            >
              History
            </a>
            <a
              href={`/p/${project.slug}/diff/${snapshot.version}`}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
            >
              Diff
            </a>
          </div>
          {snapshot.state === "published" ? (
            <button
              onClick={onVerify}
              className="rounded-full border border-emerald-400 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/10"
            >
              Verify
            </button>
          ) : null}
        </div>

        {copyStatus ? <p className="text-xs text-zinc-400 print:hidden">{copyStatus}</p> : null}
        {verifyResult ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 print:hidden">
            <p className="text-sm font-semibold text-white">{formatVerifyHeadline(verifyResult)}</p>
            <p className="mt-1 text-xs text-zinc-400">{formatVerifyDetail(verifyResult)}</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-zinc-200">Raw verify result</summary>
              <pre className="mt-3 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs text-zinc-200">
                {JSON.stringify(verifyResult, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}
      </div>

      {showRaw ? (
        <pre className="mt-6 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 text-xs text-zinc-200 print:border-zinc-300 print:bg-white print:text-black">
          {JSON.stringify(snapshot.canonical_json, null, 2)}
        </pre>
      ) : (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 text-sm text-zinc-300 print:border-zinc-300 print:bg-white print:text-black">
          <p>
            This receipt is a deterministic snapshot of on-chain and explorer evidence for{" "}
            <span className="font-semibold">{project.name}</span>.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 print:border-zinc-300 print:bg-white">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Prechecklist</p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>Verification: {formatCheck(canonical.verification?.isVerified?.status)}</li>
                <li>Upgradeable: {formatCheck(canonical.derived?.isUpgradeable?.value ? "yes" : "no")}</li>
                <li>Admin powers: {formatCheck(canonical.derived?.hasAdminPowers?.value ? "yes" : "no")}</li>
                <li>ABI available: {formatCheck(canonical.verification?.abiAvailable?.value ? "yes" : "no")}</li>
                <li>Source available: {formatCheck(canonical.verification?.sourceAvailable?.value ? "yes" : "no")}</li>
                <li>Total supply: {canonical.token?.totalSupply?.value ? "✅ present" : "❔ missing"}</li>
              </ul>
            </div>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Hash proves integrity of the canonical snapshot JSON.</li>
            <li>Diff shows trust-relevant changes across versions.</li>
            <li>Watch Mode notifies verified watchers when fields change.</li>
          </ul>
        </div>
      )}
    </section>
  );
}

function formatCheck(status: unknown) {
  if (status === "yes") return "✅ present";
  if (status === "no") return "❌ missing";
  if (status === "conflict") return "⚠️ conflict";
  return "❔ unknown";
}

function getStatusMeta(status: unknown): StatusMeta {
  if (status === "yes" || status === "no" || status === "unknown" || status === "conflict") {
    return statusMeta[status]!;
  }
  return statusMeta.unknown!;
}

function formatVerifyHeadline(result: any) {
  if (!result || typeof result !== "object") return "Verification result unavailable";
  if (result.ok === false) return "Verification failed";
  const status = result.result?.status as unknown;
  if (status === "valid") return "✅ Verified";
  if (status === "invalid") return "❌ Verification failed";
  if (status === "error") return "⚠️ Could not verify";
  return "Verification result";
}

function formatVerifyDetail(result: any) {
  if (!result || typeof result !== "object") return "";
  if (result.ok === false) return String(result.error ?? "Unknown error");
  const message = result.result?.evidence?.message as unknown;
  return typeof message === "string" ? message : "";
}

function getLineItemContext(id: string, canonical: LaunchSnapshot) {
  if (id === "proxy") {
    const status = canonical.proxy?.isProxy?.status;
    const provenance = canonical.proxy?.isProxy?.provenance;
    const secondary =
      status === "unknown"
        ? `Why unknown: we couldn't confirm whether this token uses a proxy (${provenance ?? "unknown source"}).`
        : "If upgradeable, the code behind this token can change without changing the address.";
    return { primary: "Checks if this token can be upgraded.", secondary };
  }

  if (id === "admin") {
    const status = canonical.proxy?.admin?.status;
    const provenance = canonical.proxy?.admin?.provenance;
    const secondary =
      status === "unknown"
        ? `Why unknown: we couldn't detect an admin address (${provenance ?? "unknown source"}).`
        : "Admin/owner addresses can often upgrade or change critical behavior.";
    return { primary: "Looks for an admin address that may control upgrades.", secondary };
  }

  if (id === "verify") {
    const status = canonical.verification?.isVerified?.status;
    const provenance = canonical.verification?.isVerified?.provenance;
    const secondary =
      status === "unknown"
        ? `Why unknown: explorer/source verification data wasn't available (${provenance ?? "unknown source"}).`
        : "Verified source/ABI makes it easier to audit and detect admin powers.";
    return { primary: "Checks whether the contract is verified on an explorer.", secondary };
  }

  if (id === "supply") {
    const status = canonical.token?.totalSupply?.status;
    const provenance = canonical.token?.totalSupply?.provenance;
    const secondary =
      status === "unknown"
        ? `Why unknown: we couldn't read total supply (${provenance ?? "unknown source"}).`
        : "Supply is a core disclosure; changes can indicate minting or unusual behavior.";
    return { primary: "Reads the token’s reported total supply.", secondary };
  }

  if (id === "token") {
    const status = canonical.token?.name?.status ?? canonical.token?.symbol?.status;
    const provenance = canonical.token?.name?.provenance ?? canonical.token?.symbol?.provenance;
    const secondary =
      status === "unknown"
        ? `Why unknown: we couldn't read name/symbol (${provenance ?? "unknown source"}).`
        : "Name/symbol help users confirm they’re looking at the intended token.";
    return { primary: "Reads human-friendly token identifiers.", secondary };
  }

  return { primary: null as string | null, secondary: null as string | null };
}
