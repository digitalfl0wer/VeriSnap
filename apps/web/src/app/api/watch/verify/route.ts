import { getWorker } from "@/lib/worker";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return Response.json({ ok: false, error: "Missing token" }, { status: 400 });

  try {
    const worker = getWorker();
    await worker.verifyWatcher({ token });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

