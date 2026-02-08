export function GET(request: Request) {
  const url = new URL(request.url);
  const provided = request.headers.get("x-cron-secret") ?? url.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;

  if (!expected || provided !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  return poll().catch((error) => {
    const message = error instanceof Error ? error.message : "poll failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  });
}

async function poll() {
  const { getWorker } = await import("@/lib/worker");
  const worker = getWorker();
  const result = await worker.pollOnce();
  return Response.json({ ok: true, result });
}
