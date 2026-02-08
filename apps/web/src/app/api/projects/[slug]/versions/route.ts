import { createSupabaseRestClient, getProjectBySlug, listPublishedSnapshots } from "@verisnap/db";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const client = createSupabaseRestClient({
      supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
      anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    const project = await getProjectBySlug(client, params.slug);
    if (!project) return Response.json({ ok: false, error: "Not found" }, { status: 404 });

    const snapshots = await listPublishedSnapshots(client, project.id);
    return Response.json({ ok: true, project, snapshots });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

