import { createSupabaseRestClient, getProjectBySlug, getSnapshotByVersion } from "@verisnap/db";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export default async function DiffPage({ params }: { params: { slug: string; version: string } }) {
  const version = Number(params.version);
  if (!Number.isFinite(version)) {
    return (
      <main className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Bad request</h1>
        <p className="text-zinc-400">Invalid version.</p>
      </main>
    );
  }

  const client = createSupabaseRestClient({
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  const project = await getProjectBySlug(client, params.slug);
  const snapshot = project ? await getSnapshotByVersion(client, project.id, version) : null;
  if (!project || !snapshot) {
    return (
      <main className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Not found</h1>
        <p className="text-zinc-400">Unknown project or snapshot.</p>
      </main>
    );
  }

  const diffs = await client.request<any[]>({
    mode: "anon",
    path: "/rest/v1/diffs",
    query: { snapshot_id: `eq.${snapshot.id}`, select: "*" },
  });
  const diff = diffs[0]?.diff ?? null;

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.5em] text-zinc-500">Diff</p>
        <h1 className="text-2xl font-semibold text-white">
          {project.name} · v{snapshot.version}
        </h1>
        <p className="text-sm text-zinc-400">
          <a className="underline" href={`/p/${project.slug}/v/${snapshot.version}`}>
            Back to receipt
          </a>
        </p>
      </header>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
        {!diff ? (
          <p className="text-sm text-zinc-400">No diff recorded for this version (or it is the first version).</p>
        ) : (
          <pre className="overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 text-xs text-zinc-200">
            {JSON.stringify(diff, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}

