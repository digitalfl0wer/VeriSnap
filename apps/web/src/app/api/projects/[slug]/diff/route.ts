import { createSupabaseRestClient, getProjectBySlug, getSnapshotByVersion } from "@verisnap/db";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    const url = new URL(request.url);
    const versionRaw = url.searchParams.get("version");
    const version = versionRaw ? Number(versionRaw) : NaN;
    if (!Number.isFinite(version)) {
      return Response.json({ ok: false, error: "Missing version" }, { status: 400 });
    }

    const client = createSupabaseRestClient({
      supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
      anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    const project = await getProjectBySlug(client, params.slug);
    if (!project) return Response.json({ ok: false, error: "Not found" }, { status: 404 });

    const snapshot = await getSnapshotByVersion(client, project.id, version);
    if (!snapshot) return Response.json({ ok: false, error: "Snapshot not found" }, { status: 404 });

    const rows = await client.request<unknown[]>({
      mode: "anon",
      path: "/rest/v1/diffs",
      query: { snapshot_id: `eq.${snapshot.id}`, select: "*" },
    });

    const diff = rows[0] ?? null;
    return Response.json({ ok: true, project, snapshot, diff });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

