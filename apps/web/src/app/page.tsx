"use client";

import { useState } from "react";

const receiptMeta = {
  project: "Launch Receipt: Veri Snap Token",
  status: "Ready to publish",
  hash: "0x8c2a5e0f5a8c7aaf8e4aa5b66f8fd0e9573c66a5f8a1f4de4a6aa3b7c7f4e6d8",
  cid: "bafybeiaa52t7bfrl3rh7gklzdvp5n7chtyqjuupxj5v7uybjaz3olph65e",
  version: "v1.2.0",
  timestamp: "Feb 2, 2026 · 14:18 UTC",
};

const lineItems = [
  {
    id: "mint",
    label: "Mint status",
    value: "Layer-2 wrapper minted, audit signed off",
    detail: "All required wallet signers confirmed",
    status: "pass",
  },
  {
    id: "allocation",
    label: "Allocation & supply",
    value: "Fixed 100M supply · 3M liquidity reserve",
    detail: "No reservation overrides detected",
    status: "pass",
  },
  {
    id: "audits",
    label: "Audits + KYC",
    value: "Audit report pending (expected Feb 10)",
    detail: "KYC evidence not submitted yet",
    status: "pending",
  },
  {
    id: "metadata",
    label: "Metadata & assets",
    value: "IPFS metadata CID available",
    detail: "Images + socials verified for proof",
    status: "pass",
  },
];

const statusMeta: Record<
  string,
  { icon: string; label: string; color: string; description: string }
> = {
  pass: {
    icon: "✅",
    label: "Good",
    color: "text-emerald-400",
    description: "No blockers detected",
  },
  pending: {
    icon: "❔",
    label: "Pending",
    color: "text-sky-400",
    description: "Action item needs follow-up",
  },
  warn: {
    icon: "⚠️",
    label: "Warning",
    color: "text-amber-400",
    description: "Review before publishing",
  },
  fail: {
    icon: "❌",
    label: "Fail",
    color: "text-rose-400",
    description: "Stop — fix this first",
  },
};

const plainSummary = [
  "Snapshot captures Base launch readiness: token info, teams, and supply commitments.",
  "On-chain proofs (contract metadata + liquidity info) are verified via BaseScan.",
  "Audit/KYC evidence needs to be attached before hitting publish.",
];

const rawData = {
  addresses: [
    { label: "Contract", value: "0x3f123c2b0d0562f7b7b8d3f5a5d49b4f6ae12d4c" },
    { label: "Treasury Multisig", value: "0x7d34f9c3b1b3d81a3f43f2c7c3aa9d2f5c8876b1" },
    { label: "Liquidity Pair", value: "0x9a66d5b4c6339f1e2421adfe1c4f6f5c2c33a9d2" },
  ],
  evidence: [
    "Explorer proof: BaseScan verification snapshot #4258",
    "IPFS CID for metadata: bafybeigdyrztp3ul5a2gxly3t6s7eef2f3r2h3iz3xkhs62ky5yyfoo7ia",
    "Audit doc: placeholder link (pending final PDF)",
  ],
  provenance: [
    "Builder: <Builder CLI v0.9.1 (local)>",
    "Source: workshops/receipt-builder/launch-config.json",
    "Timestamp: Feb 2 2026 14:18 UTC",
  ],
};

const timeline = [
  {
    version: "v1.2.0",
    label: "Ready to publish",
    timestamp: "Today · 14:18 UTC",
  },
  {
    version: "v1.1.2",
    label: "Liquidity adjusted",
    timestamp: "Jan 26 · 18:02 UTC",
  },
  {
    version: "v1.1.0",
    label: "Snapshot created",
    timestamp: "Jan 19 · 09:12 UTC",
  },
];

const diffHighlights = [
  "Liquidity reserve adjusted from 2.5M to 3M tokens.",
  "Metadata CID rotated after illustrator sign-off.",
  "Audit link added to prechecklist (pending final hash).",
];

const checklist = {
  present: [
    "Immutable token metadata (symbol, decimals, total supply).",
    "Liquidity proof attached from BaseSwap pools.",
    "Team multisig addresses provided.",
  ],
  missing: [
    "Signed audit report (final)",
    "KYC link for build leads",
    "Marketing assets for builder preview",
  ],
  builderLinks: [
    { label: "Add audit evidence", href: "#builder-audit" },
    { label: "Attach KYC proof", href: "#builder-kyc" },
    { label: "Link docs repo", href: "#builder-docs" },
  ],
};

export default function HomePage() {
  const [showRaw, setShowRaw] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleCopy = async (text: string, label: string) => {
    if (!navigator?.clipboard) {
      setCopyStatus("Clipboard unavailable in this browser");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${label} copied to clipboard`);
    } catch (error) {
      setCopyStatus(`Unable to copy ${label}`);
    }
    window.setTimeout(() => setCopyStatus(null), 1800);
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-sm text-zinc-200 print:bg-white print:text-black sm:px-8 md:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.5em] text-zinc-500">
            LaunchReceipt (V1) · Receipt-first UI
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {receiptMeta.project}
          </h1>
          <p className="text-zinc-400">
            Public, shareable, versioned receipts for ERC-20 launches on Base. Every published
            snapshot includes hashes, CIDs, provenance, and history.
          </p>
        </header>

        <section className="rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-6 shadow-2xl shadow-black/50 print:border-none print:bg-white print:shadow-none">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Receipt</p>
              <h2 className="text-xl font-semibold text-white">{receiptMeta.status}</h2>
              <p className="text-xs text-zinc-400">{receiptMeta.timestamp}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRaw(false)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  showRaw ? "border-zinc-700 text-zinc-400" : "border-emerald-400 text-emerald-300"
                }`}
              >
                Plain language
              </button>
              <button
                onClick={() => setShowRaw(true)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  showRaw ? "border-emerald-400 text-emerald-300" : "border-zinc-700 text-zinc-400"
                }`}
              >
                Raw proof view
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {lineItems.map((item) => {
              const meta = statusMeta[item.status] ?? statusMeta.pending;
              return (
                <article
                  key={item.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 print:border-zinc-300 print:bg-white"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <p className="text-zinc-400">{item.detail}</p>
                    <span className={`flex items-center gap-1 text-[0.7rem] font-semibold ${meta.color}`}>
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 print:border-none print:bg-white">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Hash</p>
                <p className="break-words font-mono text-sm text-white">{receiptMeta.hash}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">CID</p>
                <p className="break-words font-mono text-sm text-white">{receiptMeta.cid}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <button
                onClick={() => handleCopy(receiptMeta.hash, "hash")}
                className="rounded-full bg-zinc-700/60 px-4 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-zinc-600"
              >
                Copy hash
              </button>
              <button
                onClick={() => handleCopy(receiptMeta.cid, "CID")}
                className="rounded-full bg-zinc-700/60 px-4 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-zinc-600"
              >
                Copy CID
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-full border border-dashed border-zinc-600 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-white"
              >
                Print view
              </button>
              {copyStatus ? (
                <span className="text-xs text-emerald-400">{copyStatus}</span>
              ) : null}
            </div>
            <div className="grid gap-3 border-t border-dashed border-zinc-800 pt-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Version</p>
                <p className="text-base font-semibold text-white">{receiptMeta.version}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Snapshot time</p>
                <p className="text-base font-semibold text-white">{receiptMeta.timestamp}</p>
              </div>
              <div className="flex items-center justify-center">
                <div className="h-24 w-24 rounded-2xl border border-zinc-800 bg-white/5 text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-zinc-300">
                  QR
                  <br />
                  Placeholder
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-6 print:border-none print:bg-white">
          {showRaw ? (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Raw evidence & provenance</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4 print:border-zinc-300 print:bg-white">
                  <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Addresses</p>
                  {rawData.addresses.map((entry) => (
                    <p key={entry.value} className="text-sm font-mono text-zinc-100">
                      <span className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">
                        {entry.label}
                      </span>
                      <br />
                      {entry.value}
                    </p>
                  ))}
                </div>
                <div className="space-y-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4 print:border-zinc-300 print:bg-white">
                  <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Evidence</p>
                  {rawData.evidence.map((entry) => (
                    <p key={entry} className="text-sm text-zinc-200">
                      {entry}
                    </p>
                  ))}
                </div>
                <div className="space-y-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4 print:border-zinc-300 print:bg-white">
                  <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Provenance</p>
                  {rawData.provenance.map((entry) => (
                    <p key={entry} className="text-sm text-zinc-200">
                      {entry}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Plain-language summary</h3>
              <ul className="space-y-3 text-zinc-300">
                {plainSummary.map((sentence) => (
                  <li key={sentence} className="list-disc pl-5 leading-relaxed">
                    {sentence}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="grid gap-6 rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-6 print:border-none print:bg-white lg:grid-cols-2 lg:items-start">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">History timeline</h3>
              <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">Versions</span>
            </div>
            <ol className="space-y-3 text-sm text-zinc-300">
              {timeline.map((entry) => (
                <li key={entry.version} className="flex items-start gap-3">
                  <span className="mt-1 flex h-3 w-3]}
