import { getWorker } from "@/lib/worker";

type PublishRequest = {
  slug: string;
  version: number;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PublishRequest | null;
  if (!body?.slug || !body.version) {
    return Response.json({ ok: false, error: "Missing slug/version" }, { status: 400 });
  }

  try {
    const worker = getWorker();
    const result = await worker.publishDraft({ slug: body.slug, version: body.version });
    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish draft";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

