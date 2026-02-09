import { createSupabaseRestClient, getLastWatchRun, getProjectBySlug } from "@verisnap/db";
import { getWorker } from "@/lib/worker";
import { assertAdmin } from "@/lib/admin";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export async function POST(request: Request) {
  try {
    assertAdmin(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return Response.json({ ok: false, error: message }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { slug?: string } | null;
  const slug = body?.slug?.trim();
  if (!slug) return Response.json({ ok: false, error: "Missing slug" }, { status: 400 });

  try {
    const client = createSupabaseRestClient({
      supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
      anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    });

    const project = await getProjectBySlug(client, slug);
    if (!project) return Response.json({ ok: false, error: "Not found" }, { status: 404 });

    const last = await getLastWatchRun(client, project.id);
    const lastAt = last?.executed_at ? new Date(last.executed_at).getTime() : 0;
    if (lastAt && Date.now() - lastAt < 60_000) {
      return Response.json({ ok: false, error: "Rate limited: try again in ~1 minute" }, { status: 429 });
    }

    const worker = getWorker();
    const changed = await worker.runWatchCheck(slug);
    return Response.json({ ok: true, result: { changed } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
