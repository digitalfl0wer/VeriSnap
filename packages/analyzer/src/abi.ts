import { keccak_256 } from "@noble/hashes/sha3.js";

const TEXT_ENCODER = new TextEncoder();

export function encodeSelector(signature: string): string {
  const digest = keccak_256(TEXT_ENCODER.encode(signature));
  const selector = digest.slice(0, 4);
  return `0x${bytesToHex(selector)}`;
}

export function decodeAbiString(hex: string): string | undefined {
  const bytes = hexToBytes(hex);
  if (bytes.length < 64) return undefined;

  const offset = Number(readUint256(bytes, 0));
  if (offset + 32 > bytes.length) return undefined;

  const len = Number(readUint256(bytes, offset));
  const start = offset + 32;
  const end = start + len;
  if (end > bytes.length) return undefined;

  const strBytes = bytes.slice(start, end);
  try {
    return new TextDecoder().decode(strBytes);
  } catch {
    return undefined;
  }
}

export function decodeAbiUint8(hex: string): number | undefined {
  const bytes = hexToBytes(hex);
  if (bytes.length < 32) return undefined;
  const value = readUint256(bytes, 0);
  if (value > BigInt(255)) return undefined;
  return Number(value);
}

export function decodeAbiUint256ToDecimalString(hex: string): string | undefined {
  const bytes = hexToBytes(hex);
  if (bytes.length < 32) return undefined;
  return readUint256(bytes, 0).toString(10);
}

export function normalizeAddressFromStorageSlot(hex: string): `0x${string}` | null {
  const trimmed = hex.trim().toLowerCase();
  if (!trimmed.startsWith("0x")) return null;
  const raw = trimmed.slice(2).padStart(64, "0");
  if (/^0+$/.test(raw)) return null;
  return `0x${raw.slice(24)}`;
}

function readUint256(bytes: Uint8Array, offset: number): bigint {
  let value = BigInt(0);
  for (let i = 0; i < 32; i++) {
    value = (value << BigInt(8)) + BigInt(bytes[offset + i] ?? 0);
  }
  return value;
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  const padded = normalized.length % 2 === 0 ? normalized : `0${normalized}`;
  const out = new Uint8Array(padded.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

