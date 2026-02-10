"use client";

import { useEffect, useState } from "react";

type ApiResponse =
  | { ok: true; snapshot: any }
  | { ok: false; error: string };

export default function TxReceiptView({ txHash }: { txHash: string }) {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const normalized = txHash.trim();
  const isValid = /^0x[0-9a-fA-F]{64}$/.test(normalized);

  useEffect(() => {
    if (!isValid) return;
    setError(null);
    setData(null);

    const controller = new AbortController();
    fetch(`/api/receipt/${encodeURIComponent(normalized)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json: ApiResponse) => {
        if (!json.ok) throw new Error(json.error);
        setData(json.snapshot);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load receipt");
      });

    return () => controller.abort();
  }, [isValid, normalized]);

  if (!isValid) {
    return (
      <main className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Receipt</h1>
        <p className="text-zinc-400">Invalid tx hash. Expected a 0x-prefixed 32-byte hash.</p>
        <p className="text-sm text-zinc-400">
          <a className="underline" href="/">
            Back to home
          </a>
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.5em] text-zinc-500">Receipt</p>
        <h1 className="text-2xl font-semibold text-white">Transaction receipt</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="break-all font-mono text-xs text-zinc-300">{normalized}</p>
          <button
            onClick={() => copyToClipboard(normalized, "Tx hash", setCopyStatus)}
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
          >
            Copy tx hash
          </button>
        </div>
      </header>

      {error ? <p className="rounded-2xl border border-rose-900 bg-rose-950/40 p-4 text-rose-200">{error}</p> : null}
      {copyStatus ? <p className="text-xs text-zinc-400">{copyStatus}</p> : null}
      {!data ? (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6">
          <p className="text-sm text-zinc-300">Loading receipt…</p>
          <ul className="mt-3 space-y-1 text-sm text-zinc-400">
            <li className="animate-pulse">Fetching transaction receipt</li>
            <li className="animate-pulse">Computing canonical hash</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              className="rounded-2xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
              href="/"
            >
              Back
            </a>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setData(null);
                fetch(`/api/receipt/${encodeURIComponent(normalized)}`)
                  .then((r) => r.json())
                  .then((json: ApiResponse) => {
                    if (!json.ok) throw new Error(json.error);
                    setData(json.snapshot);
                  })
                  .catch((e) => setError(e instanceof Error ? e.message : "Failed to load receipt"));
              }}
              className="rounded-2xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
            >
              Retry
            </button>
          </div>
        </section>
      ) : (
        <ReceiptCard snapshot={data} onCopyStatus={setCopyStatus} />
      )}
    </main>
  );
}

function ReceiptCard({ snapshot, onCopyStatus }: { snapshot: any; onCopyStatus: (v: string | null) => void }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Base mainnet</p>
          <p className="text-sm text-zinc-300">Block timestamp: {snapshot.blockTimestamp}</p>
          <p className="text-sm text-zinc-300">
            Status: <span className="font-semibold text-white">{snapshot.receipt.status}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
            href={snapshot.links.basescanTx}
            target="_blank"
            rel="noreferrer"
          >
            BaseScan
          </a>
          <a
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
            href={snapshot.links.blockscoutTx}
            target="_blank"
            rel="noreferrer"
          >
            Blockscout
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">From</p>
          <p className="mt-2 break-all font-mono text-xs text-zinc-200">{snapshot.tx.from}</p>
          <button
            onClick={() => copyToClipboard(snapshot.tx.from, "From", onCopyStatus)}
            className="mt-2 rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
          >
            Copy
          </button>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">To</p>
          <p className="mt-2 break-all font-mono text-xs text-zinc-200">{snapshot.tx.to ?? "—"}</p>
          {snapshot.tx.to ? (
            <button
              onClick={() => copyToClipboard(snapshot.tx.to, "To", onCopyStatus)}
              className="mt-2 rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
            >
              Copy
            </button>
          ) : null}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Gas used</p>
          <p className="mt-2 font-mono text-xs text-zinc-200">{snapshot.receipt.gasUsed}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Logs</p>
          <p className="mt-2 font-mono text-xs text-zinc-200">{snapshot.receipt.logs.length}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Canonical hash</p>
        <p className="mt-2 break-all font-mono text-xs text-zinc-200">{snapshot.canonicalHash}</p>
        <button
          onClick={() => copyToClipboard(snapshot.canonicalHash, "Hash", onCopyStatus)}
          className="mt-2 rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
        >
          Copy hash
        </button>
      </div>

      <details className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-200">Raw canonical JSON</summary>
        <pre className="mt-3 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs text-zinc-200">
          {snapshot.canonicalJson}
        </pre>
      </details>
    </section>
  );
}

async function copyToClipboard(value: string, label: string, setStatus: (v: string | null) => void) {
  try {
    await navigator.clipboard.writeText(value);
    setStatus(`${label} copied`);
    setTimeout(() => setStatus(null), 1500);
  } catch {
    setStatus("Copy failed");
    setTimeout(() => setStatus(null), 1500);
  }
}
