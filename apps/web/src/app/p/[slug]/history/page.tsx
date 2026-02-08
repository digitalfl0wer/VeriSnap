import { createSupabaseRestClient, getProjectBySlug, listPublishedSnapshots, type SnapshotRow } from "@verisnap/db";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export default async function HistoryPage({ params }: { params: { slug: string } }) {
  const client = createSupabaseRestClient({
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  const project = await getProjectBySlug(client, params.slug);
  const snapshots = project ? await listPublishedSnapshots(client, project.id) : [];

  if (!project) {
    return (
      <main className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Not found</h1>
        <p className="text-zinc-400">Unknown project.</p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.5em] text-zinc-500">History</p>
        <h1 className="text-2xl font-semibold text-white">{project.name}</h1>
        <p className="text-sm text-zinc-400">
          <a className="underline" href={`/p/${project.slug}`}>
            Back to latest
          </a>
        </p>
      </header>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
        {snapshots.length === 0 ? (
          <p className="text-sm text-zinc-400">No published snapshots yet.</p>
        ) : (
          <ol className="space-y-3">
            {(snapshots as SnapshotRow[]).map((s) => (
              <li key={s.id} className="flex flex-col gap-1 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">v{s.version}</p>
                  <p className="text-xs text-zinc-400">{new Date(s.created_at).toUTCString()}</p>
                </div>
                <p className="break-all font-mono text-[0.7rem] text-zinc-300">{s.canonical_hash}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
                    href={`/p/${project.slug}/v/${s.version}`}
                  >
                    View
                  </a>
                  <a
                    className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
                    href={`/p/${project.slug}/diff/${s.version}`}
                  >
                    Diff
                  </a>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
