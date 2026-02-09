import { getWorker } from "@/lib/worker";
import { rateLimitOrThrow, rateLimitKeyOrThrow } from "@/lib/rateLimit";

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
    rateLimitOrThrow({ request, key: "watch_subscribe_ip", windowMs: 10 * 60_000, max: 10 });
    const emailKey = body.email.trim().toLowerCase();
    rateLimitKeyOrThrow({ key: `watch_subscribe_email:${emailKey}`, windowMs: 60 * 60_000, max: 5 });

    const worker = getWorker();
    const result = await worker.subscribeWatcher(body);
    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to subscribe";
    const status = message === "Rate limited" ? 429 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}
