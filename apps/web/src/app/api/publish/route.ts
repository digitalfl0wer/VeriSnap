import { getWorker } from "@/lib/worker";
import { isAdminRequest } from "@/lib/admin";
import { verifyClaimToken, buildClaimMessage } from "@/lib/claims";
import { recoverAddressFromPersonalSign } from "@verisnap/worker";
import { rateLimitOrThrow, rateLimitKeyOrThrow } from "@/lib/rateLimit";

type PublishRequest = {
  slug: string;
  version: number;
  token?: string;
  message?: string;
  signature?: `0x${string}`;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PublishRequest | null;
  if (!body?.slug || !body.version) {
    return Response.json({ ok: false, error: "Missing slug/version" }, { status: 400 });
  }

  try {
    const isAdmin = isAdminRequest(request);

    if (!isAdmin) {
      rateLimitOrThrow({ request, key: "publish_ip", windowMs: 10 * 60_000, max: 10 });

      if (!body.token || !body.message || !body.signature) {
        return Response.json(
          { ok: false, error: "Missing claim token/message/signature (required for non-admin publish)" },
          { status: 400 }
        );
      }

      const payload = verifyClaimToken(body.token);
      if (payload.slug !== body.slug || payload.version !== body.version) {
        return Response.json({ ok: false, error: "Claim token does not match publish request" }, { status: 400 });
      }

      const expectedMessage = buildClaimMessage(payload);
      if (body.message !== expectedMessage) {
        return Response.json({ ok: false, error: "Claim message mismatch" }, { status: 400 });
      }

      const rpcUrl = process.env.BASE_RPC_URL;
      if (!rpcUrl) return Response.json({ ok: false, error: "Missing BASE_RPC_URL" }, { status: 500 });

      const signer = await recoverAddressFromPersonalSign({
        rpcUrl,
        message: body.message,
        signature: body.signature,
      });

      rateLimitKeyOrThrow({ key: `publish_addr:${signer}`, windowMs: 60 * 60_000, max: 20 });
    }

    const worker = getWorker();
    const result = await worker.publishDraft({ slug: body.slug, version: body.version });
    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish draft";
    const status = message === "Rate limited" ? 429 : message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}
