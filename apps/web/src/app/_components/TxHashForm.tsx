"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function isTxHash(value: string) {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

export default function TxHashForm() {
  const router = useRouter();
  const [txHash, setTxHash] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const normalized = txHash.trim();
  const isValid = isTxHash(normalized);
  const error = touched && !isValid ? "Enter a valid 0x…64 hex tx hash." : null;

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setStatus(null);
    if (!isValid) {
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
          onBlur={() => setTouched(true)}
          placeholder="0x…"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-emerald-400"
        />
        <p className="text-xs text-zinc-500">Paste a transaction hash to view a lightweight receipt.</p>
      </label>
      <button
        type="button"
        onClick={async () => {
          setStatus(null);
          try {
            const text = await navigator.clipboard.readText();
            if (text) {
              setTxHash(text);
              setTouched(true);
              setStatus("Pasted from clipboard");
            }
          } catch {
            setStatus("Clipboard paste blocked by browser permissions");
          }
        }}
        className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
      >
        Paste
      </button>
      <button
        type="submit"
        disabled={!isValid}
        className="rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-black hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-sky-400"
      >
        Fetch receipt
      </button>
      {error ? <p className="text-sm text-rose-300 sm:col-span-2">{error}</p> : null}
      {status ? <p className="text-sm text-zinc-400 sm:col-span-2">{status}</p> : null}
    </form>
  );
}
