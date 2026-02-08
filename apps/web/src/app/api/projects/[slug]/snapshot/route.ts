import { createSupabaseRestClient, getLatestPublishedSnapshot, getProjectBySlug, getSnapshotByVersion } from "@verisnap/db";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function db() {
  return createSupabaseRestClient({
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const url = new URL(_request.url);
    const versionRaw = url.searchParams.get("version");
    const version = versionRaw ? Number(versionRaw) : null;

    const client = db();
    const project = await getProjectBySlug(client, params.slug);
    if (!project) return Response.json({ ok: false, error: "Not found" }, { status: 404 });

    const snapshot =
      version === null
        ? await getLatestPublishedSnapshot(client, project.id)
        : await getSnapshotByVersion(client, project.id, version);

    if (!snapshot) return Response.json({ ok: false, error: "Snapshot not found" }, { status: 404 });
    return Response.json({ ok: true, project, snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

