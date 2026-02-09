import { keccak_256 } from "@noble/hashes/sha3.js";

const TEXT_ENCODER = new TextEncoder();

export function hashPersonalMessage(message: string): `0x${string}` {
  const msg = message;
  const prefix = `\u0019Ethereum Signed Message:\n${TEXT_ENCODER.encode(msg).length}`;
  const bytes = concatBytes(TEXT_ENCODER.encode(prefix), TEXT_ENCODER.encode(msg));
  const digest = keccak_256(bytes);
  return `0x${bytesToHex(digest)}`;
}

export async function recoverAddressFromPersonalSign(args: {
  rpcUrl: string;
  message: string;
  signature: `0x${string}`;
}): Promise<`0x${string}`> {
  const msgHash = hashPersonalMessage(args.message);
  const { v, r, s } = parseSignature(args.signature);

  const input = `0x${strip0x(msgHash)}${pad32(v)}${pad32(r)}${pad32(s)}` as `0x${string}`;
  const result = await rpcCall<string>(args.rpcUrl, "eth_call", [
    {
      to: "0x0000000000000000000000000000000000000001",
      data: input,
    },
    "latest",
  ]);

  if (!result || result === "0x") throw new Error("ecrecover failed");
  const recovered = `0x${strip0x(result).slice(-40)}`.toLowerCase() as `0x${string}`;
  if (!/^0x[0-9a-f]{40}$/.test(recovered)) throw new Error("ecrecover returned invalid address");
  return recovered;
}

function parseSignature(signature: `0x${string}`): { v: string; r: string; s: string } {
  const hex = strip0x(signature);
  if (hex.length !== 130) throw new Error("Invalid signature length");

  const r = hex.slice(0, 64);
  const s = hex.slice(64, 128);
  let vByte = Number.parseInt(hex.slice(128, 130), 16);
  if (vByte === 0 || vByte === 1) vByte += 27;
  if (vByte !== 27 && vByte !== 28) throw new Error("Invalid signature v");
  const v = vByte.toString(16).padStart(2, "0");

  return { v, r, s };
}

async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const payload = { jsonrpc: "2.0", id: 1, method, params };
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`RPC ${method} failed (${response.status})`);
  }

  const json = (await response.json()) as { result?: T; error?: { message?: string } };
  if (json.error?.message) throw new Error(json.error.message);
  return json.result as T;
}

function strip0x(value: string): string {
  return value.startsWith("0x") ? value.slice(2) : value;
}

function pad32(hexByteOrWord: string): string {
  const raw = strip0x(hexByteOrWord);
  return raw.padStart(64, "0");
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

