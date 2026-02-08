"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddressForm() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const normalized = address.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(normalized)) {
      setError("Enter a valid 0x…40 hex address.");
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
          placeholder="0x…"
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-emerald-400"
        />
      </label>
      <button
        type="submit"
        className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black hover:bg-emerald-400"
      >
        Generate draft
      </button>
      {error ? <p className="text-sm text-rose-300 sm:col-span-2">{error}</p> : null}
    </form>
  );
}

