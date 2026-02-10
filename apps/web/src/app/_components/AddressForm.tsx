"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function isHexAddress(value: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

export default function AddressForm() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const normalized = address.trim();
  const isValid = isHexAddress(normalized);
  const error = touched && !isValid ? "Enter a valid 0x…40 hex address." : null;

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setStatus(null);
    if (!isValid) {
      return;
    }
    router.push(`/draft?address=${encodeURIComponent(normalized)}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex-1 space-y-1">
        <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">Contract address</span>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="0x…"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-emerald-400"
        />
        <p className="text-xs text-zinc-500">
          Paste the token contract on Base (example: <code className="font-mono">0x…</code>).
        </p>
      </label>
      <button
        type="button"
        onClick={async () => {
          setStatus(null);
          try {
            const text = await navigator.clipboard.readText();
            if (text) {
              setAddress(text);
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
        className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-emerald-500"
      >
        Generate draft
      </button>
      {error ? <p className="text-sm text-rose-300 sm:col-span-2">{error}</p> : null}
      {status ? <p className="text-sm text-zinc-400 sm:col-span-2">{status}</p> : null}
    </form>
  );
}
