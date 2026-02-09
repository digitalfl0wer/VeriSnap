import { type Address } from "@verisnap/core";
import { getWorker } from "@/lib/worker";
import { rateLimitOrThrow } from "@/lib/rateLimit";

type DraftRequest = {
  contractAddress: Address;
  slug?: string;
  name?: string;
  builderLinks?: { label: string; url: string }[];
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as DraftRequest | null;
  if (!body?.contractAddress) {
    return Response.json({ ok: false, error: "Missing contractAddress" }, { status: 400 });
  }

  try {
    rateLimitOrThrow({ request, key: "draft_ip", windowMs: 60_000, max: 20 });
    const worker = getWorker();
    const result = await worker.generateDraft(body);
    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate draft";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
