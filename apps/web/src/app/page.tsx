import AddressForm from "./_components/AddressForm";
import TxHashForm from "./_components/TxHashForm";

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
      </header>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Generate draft</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Paste a contract address to generate a draft receipt (on-chain reads + BaseScan/Sourcify evidence).
        </p>
        <div className="mt-5">
          <AddressForm />
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="text-lg font-semibold text-white">Receipt from tx hash</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Free-plan path: RPC-first verification via <code>eth_getTransactionReceipt</code>.
        </p>
        <div className="mt-5">
          <TxHashForm />
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6 text-sm text-zinc-300">
        <h2 className="text-lg font-semibold text-white">Notes</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Watch Mode is required for published projects (double opt-in).</li>
          <li>No safety verdicts — receipts are deterministic snapshots + evidence.</li>
          <li>Configure env vars in `docs/env.md`.</li>
        </ul>
      </section>
    </main>
  );
}
