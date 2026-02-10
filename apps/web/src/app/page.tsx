import AddressForm from "./_components/AddressForm";
import TxHashForm from "./_components/TxHashForm";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="space-y-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.5em] text-zinc-500">LaunchReceipt (V1)</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Veri Snap</h1>
        <p className="max-w-2xl text-zinc-300">
          Public, shareable, versioned receipts for ERC-20 launches on Base. Generate a draft from a
          contract address, publish an immutable version, then verify + diff changes over time.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {["1) Generate", "2) Review", "3) Publish", "4) Watch"].map((s) => (
            <span key={s} className="rounded-full border border-zinc-800 bg-zinc-950/30 px-3 py-1 text-xs font-semibold text-zinc-300">
              {s}
            </span>
          ))}
          <Link
            href="/docs/quickstart"
            scroll={false}
            className="rounded-full border border-emerald-700/60 bg-emerald-950/30 px-3 py-1 text-xs font-semibold text-emerald-100 hover:border-emerald-500"
          >
            Docs
          </Link>
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">Generate draft</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Paste a token contract address to generate a draft receipt. We read on-chain data and check explorer/source verification when available.
        </p>
        <div className="surface surface-hover p-6">
          <AddressForm />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">Quick receipt from a tx hash</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Useful when you only have a transaction hash. This view uses public RPC data.
        </p>
        <div className="surface surface-hover p-6">
          <TxHashForm />
        </div>
      </section>

    </main>
  );
}
