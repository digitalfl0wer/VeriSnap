export default function HomePage() {
  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Veri Snap</h1>
        <p className="text-zinc-300">
          LaunchReceipt (V1): public, shareable, versioned “receipts” for ERC-20 token launches on Base.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-lg font-medium">Scaffold status</h2>
        <p className="mt-2 text-sm text-zinc-300">
          Repo scaffold is in place. Feature implementation starts from the tasks in <code>TASKS.md</code>.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-300">
          <li>
            PRD: <code>PRD.md</code>
          </li>
          <li>
            Tasks: <code>TASKS.md</code>
          </li>
          <li>
            Cron endpoint placeholder: <code>/api/cron/poll</code>
          </li>
        </ul>
      </section>
    </main>
  );
}

