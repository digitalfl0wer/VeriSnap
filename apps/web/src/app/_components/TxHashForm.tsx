"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TxHashForm() {
  const router = useRouter();
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const normalized = txHash.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
      setError("Enter a valid 0x…64 hex tx hash.");
      return;
    }
    router.push(`/receipt/${encodeURIComponent(normalized)}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex-1 space-y-1">
        <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">Tx hash</span>
        <input
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="0x…"
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-emerald-400"
        />
      </label>
      <button
        type="submit"
        className="rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-black hover:bg-sky-300"
      >
        Fetch receipt
      </button>
      {error ? <p className="text-sm text-rose-300 sm:col-span-2">{error}</p> : null}
    </form>
  );
}

