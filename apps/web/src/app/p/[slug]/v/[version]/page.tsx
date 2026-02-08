import Receipt from "@/app/_components/Receipt";
import { createSupabaseRestClient, getProjectBySlug, getSnapshotByVersion } from "@verisnap/db";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export default async function ProjectVersionPage({ params }: { params: { slug: string; version: string } }) {
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
        <p className="text-zinc-400">Project or snapshot not available.</p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <Receipt project={project} snapshot={snapshot} />
    </main>
  );
}

