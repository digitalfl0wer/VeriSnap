import { createClaimRequest } from "@/lib/claims";
import { rateLimitOrThrow } from "@/lib/rateLimit";

type Body = {
  tokenAddress: `0x${string}`;
  slug: string;
  version: number;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.tokenAddress || !body.slug || !body.version) {
    return Response.json({ ok: false, error: "Missing tokenAddress/slug/version" }, { status: 400 });
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(body.tokenAddress)) {
    return Response.json({ ok: false, error: "Invalid tokenAddress" }, { status: 400 });
  }

  try {
    rateLimitOrThrow({ request, key: "claim_start_ip", windowMs: 60_000, max: 20 });

    const url = new URL(request.url);
    const domain = request.headers.get("host") ?? url.host;
    const uri = process.env.APP_BASE_URL ?? `${url.protocol}//${domain}`;
    const chainId = Number(process.env.CHAIN_ID ?? process.env.BASE_CHAIN_ID ?? "84532");

    const { message, token, payload } = createClaimRequest({
      domain,
      uri,
      chainId,
      tokenAddress: body.tokenAddress,
      slug: body.slug,
      version: body.version,
    });

    return Response.json({
      ok: true,
      message,
      token,
      expiresAt: payload.expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create claim";
    const status = message === "Rate limited" ? 429 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

