import { getWorker } from "@/lib/worker";

type SubscribeRequest = {
  projectSlug: string;
  email: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SubscribeRequest | null;
  if (!body?.projectSlug || !body?.email) {
    return Response.json({ ok: false, error: "Missing projectSlug/email" }, { status: 400 });
  }

  try {
    const worker = getWorker();
    const result = await worker.subscribeWatcher(body);
    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to subscribe";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

