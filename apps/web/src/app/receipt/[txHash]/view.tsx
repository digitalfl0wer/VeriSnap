"use client";

import { useEffect, useState } from "react";

type ApiResponse =
  | { ok: true; snapshot: any }
  | { ok: false; error: string };

export default function TxReceiptView({ txHash }: { txHash: string }) {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.5em] text-zinc-500">Receipt</p>
        <h1 className="text-2xl font-semibold text-white">Transaction receipt</h1>
        <p className="break-all font-mono text-xs text-zinc-300">{normalized}</p>
      </header>

      {error ? <p className="rounded-2xl border border-rose-900 bg-rose-950/40 p-4 text-rose-200">{error}</p> : null}
      {!data ? <p className="text-zinc-400">Loading…</p> : <ReceiptCard snapshot={data} />}
    </main>
  );
}

function ReceiptCard({ snapshot }: { snapshot: any }) {
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
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">To</p>
          <p className="mt-2 break-all font-mono text-xs text-zinc-200">{snapshot.tx.to ?? "—"}</p>
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

