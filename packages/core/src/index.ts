import { keccak_256 } from "@noble/hashes/sha3.js";

const TEXT_ENCODER = new TextEncoder();
const ADDRESS_KEYS = new Set(["contractAddress", "implementation", "admin", "from", "to"]);
const TIMESTAMP_KEYS = new Set(["observedAt", "blockTimestamp"]);

export type Address = `0x${string}`;

export type TruthStatus = "yes" | "no" | "unknown" | "conflict";

export type Provenance = "chain" | "basescan" | "sourcify" | "builder" | "derived";

export type SnapshotField<T> = {
  value: T;
  status: TruthStatus;
  provenance: Provenance;
  evidence?: Record<string, unknown>;
};

export type LaunchSnapshot = {
  chainId: number;
  contractAddress: Address;
  observedAt: string;
  token?: {
    name?: SnapshotField<string>;
    symbol?: SnapshotField<string>;
    decimals?: SnapshotField<number>;
    totalSupply?: SnapshotField<string>;
  };
  verification?: {
    isVerified?: SnapshotField<boolean>;
    abiAvailable?: SnapshotField<boolean>;
    sourceAvailable?: SnapshotField<boolean>;
  };
  proxy?: {
    isProxy?: SnapshotField<boolean>;
    implementation?: SnapshotField<Address | null>;
    admin?: SnapshotField<Address | null>;
  };
  derived?: {
    isUpgradeable?: SnapshotField<boolean>;
    hasAdminPowers?: SnapshotField<boolean>;
    riskOverride?: SnapshotField<boolean>;
  };
};

export type VerifySnapshotResult = {
  status: "valid" | "invalid" | "error";
  evidence: {
    computedHash?: string;
    storedHash: string;
    canonicalJson?: string;
    message?: string;
  };
};

export function canonicalizeJson(value: unknown): string {
  const canonical = canonicalizeValue(value);
  return JSON.stringify(canonical);
}

export function hashCanonicalJson(value: unknown): string {
  const canonicalJson = canonicalizeJson(value);
  const digest = keccak_256(TEXT_ENCODER.encode(canonicalJson));
  return `0x${bytesToHex(digest)}`;
}

export function verifyCanonicalJson(value: unknown | string, storedHash: string): VerifySnapshotResult {
  const normalizedStoredHash = normalizeHashString(storedHash);

  try {
    const parsed = typeof value === "string" ? (JSON.parse(value) as unknown) : value;
    const computedHash = hashCanonicalJson(parsed);
    const status = computedHash === normalizedStoredHash ? "valid" : "invalid";

    return {
      status,
      evidence: {
        storedHash: normalizedStoredHash,
        computedHash,
        canonicalJson: canonicalizeJson(parsed),
        message: status === "valid" ? "hash match" : "recomputed hash differs from stored hash",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to parse json";
    return {
      status: "error",
      evidence: { storedHash: normalizedStoredHash, message },
    };
  }
}

export function canonicalizeSnapshot(snapshot: LaunchSnapshot): string {
  return canonicalizeJson(snapshot);
}

export function hashSnapshot(snapshot: LaunchSnapshot): string {
  return hashCanonicalJson(snapshot);
}

export function verifySnapshot(
  snapshotJson: string | LaunchSnapshot,
  storedHash: string,
): VerifySnapshotResult {
  return verifyCanonicalJson(snapshotJson, storedHash);
}

function canonicalizeValue(value: unknown, path: string[] = []): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return canonicalizeString(value, path);
  }

  if (typeof value === "number") {
    return canonicalizeNumber(value);
  }

  if (Array.isArray(value)) {
    const canonicalItems = value
      .map((item, index) => canonicalizeValue(item, [...path, String(index)]))
      .filter((item) => item !== undefined);
    return canonicalItems;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => [key, canonicalizeValue(val, [...path, key])] as const)
      .filter(([, canonicalValue]) => canonicalValue !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));

    return Object.fromEntries(entries);
  }

  return value;
}

function canonicalizeString(value: string, path: string[]): string {
  const trimmed = value.trim();
  const currentKey = path.at(-1);

  if (currentKey && ADDRESS_KEYS.has(currentKey)) {
    return normalizeHexField(trimmed);
  }

  if (currentKey && TIMESTAMP_KEYS.has(currentKey)) {
    return normalizeTimestamp(trimmed);
  }

  return trimmed;
}

function canonicalizeNumber(value: number): number {
  if (Object.is(value, -0)) {
    return 0;
  }

  if (!Number.isFinite(value)) {
    throw new TypeError("non-finite numbers are not supported in snapshots");
  }

  return value;
}

function normalizeHexField(value: string): string {
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  return `0x${hex.toLowerCase()}`;
}

function normalizeTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`timestamp ${value} is not a valid ISO 8601 string`);
  }

  return date.toISOString();
}

function normalizeHashString(value: string): string {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
