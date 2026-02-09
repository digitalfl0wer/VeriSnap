import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export type ClaimRequestPayload = {
  domain: string;
  uri: string;
  chainId: number;
  tokenAddress: `0x${string}`;
  slug: string;
  version: number;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
};

export function createClaimRequest(args: {
  domain: string;
  uri: string;
  chainId: number;
  tokenAddress: `0x${string}`;
  slug: string;
  version: number;
  ttlMs?: number;
}) {
  const now = new Date();
  const ttlMs = args.ttlMs ?? 10 * 60_000;
  const expires = new Date(now.getTime() + ttlMs);

  const payload: ClaimRequestPayload = {
    domain: args.domain,
    uri: args.uri,
    chainId: args.chainId,
    tokenAddress: args.tokenAddress.toLowerCase() as `0x${string}`,
    slug: args.slug,
    version: args.version,
    nonce: randomNonce(),
    issuedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };

  const message = buildClaimMessage(payload);
  const token = signToken(payload);

  return { payload, message, token };
}

export function verifyClaimToken(token: string): ClaimRequestPayload {
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) throw new Error("Invalid claim token");

  const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
  const payload = JSON.parse(payloadJson) as ClaimRequestPayload;

  const expected = hmac(payloadB64);
  const provided = Buffer.from(sigB64, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new Error("Invalid claim token");
  }

  const expiresAtMs = Date.parse(payload.expiresAt);
  if (!Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) {
    throw new Error("Claim token expired");
  }

  return payload;
}

export function buildClaimMessage(payload: ClaimRequestPayload): string {
  return [
    `${payload.domain} wants you to sign in with your Ethereum account:`,
    `${payload.tokenAddress}`,
    ``,
    `Statement: I claim publishing rights for token ${payload.tokenAddress} (project ${payload.slug}) version ${payload.version} on chain ${payload.chainId}.`,
    `URI: ${payload.uri}`,
    `Chain ID: ${payload.chainId}`,
    `Nonce: ${payload.nonce}`,
    `Issued At: ${payload.issuedAt}`,
    `Expiration Time: ${payload.expiresAt}`,
  ].join("\n");
}

function signToken(payload: ClaimRequestPayload): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sigB64 = hmac(payloadB64).toString("base64url");
  return `${payloadB64}.${sigB64}`;
}

function hmac(payloadB64: string): Buffer {
  const secret = process.env.CLAIM_SECRET;
  if (!secret) throw new Error("Missing env var: CLAIM_SECRET");
  return createHmac("sha256", secret).update(payloadB64).digest();
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

