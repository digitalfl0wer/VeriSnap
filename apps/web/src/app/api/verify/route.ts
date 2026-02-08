import { getWorker } from "@/lib/worker";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const versionRaw = url.searchParams.get("version");
  const version = versionRaw ? Number(versionRaw) : NaN;

  if (!slug || !Number.isFinite(version)) {
    return Response.json({ ok: false, error: "Missing slug/version" }, { status: 400 });
  }

  try {
    const worker = getWorker();
    const result = await worker.verifyPublishedSnapshot({ slug, version });
    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify snapshot";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

