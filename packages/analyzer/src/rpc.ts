import type { Address, SnapshotField } from "@verisnap/core";
import type { AnalyzerRpcConfig, ERC20FieldKeys, ERC20FieldSet, ProxySlotResult } from "./types";
import {
  decodeAbiString,
  decodeAbiUint256ToDecimalString,
  decodeAbiUint8,
  encodeSelector,
  normalizeAddressFromStorageSlot,
} from "./abi";

function toSnapshotField<T>(
  provenance: SnapshotField<T>["provenance"],
  value: T,
  status: SnapshotField<T>["status"],
  evidence?: SnapshotField<T>["evidence"]
): SnapshotField<T> {
  return { value, status, provenance, evidence };
}

export async function checkContractExists(
  { rpcUrl }: AnalyzerRpcConfig,
  target: Address
): Promise<SnapshotField<boolean>> {
  const payload = {
    jsonrpc: "2.0",
    method: "eth_getCode",
    params: [target, "latest"],
    id: 1,
  };

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("RPC check failed");
  }

  const data = (await response.json()) as { result?: string };

  const exists = !!data.result && data.result !== "0x";

  return toSnapshotField("chain", exists, exists ? "yes" : "no", { result: data.result });
}

const erc20FieldDefaults: Record<ERC20FieldKeys, SnapshotField<unknown>["status"]> = {
  name: "unknown",
  symbol: "unknown",
  decimals: "unknown",
  totalSupply: "unknown",
};

const erc20MethodMap: Record<ERC20FieldKeys, { signature: string; decode: (hex: string) => unknown }> = {
  name: { signature: "name()", decode: decodeAbiString },
  symbol: { signature: "symbol()", decode: decodeAbiString },
  decimals: { signature: "decimals()", decode: decodeAbiUint8 },
  totalSupply: { signature: "totalSupply()", decode: decodeAbiUint256ToDecimalString },
};

async function callERC20Field(
  config: AnalyzerRpcConfig,
  target: Address,
  key: ERC20FieldKeys
): Promise<SnapshotField<unknown> | undefined> {
  const { rpcUrl } = config;
  const { signature, decode } = erc20MethodMap[key];
  const selector = encodeSelector(signature);

  const payload = {
    jsonrpc: "2.0",
    method: "eth_call",
    params: [
      {
        to: target,
        data: selector,
      },
      "latest",
    ],
    id: 1,
  };

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return undefined;
  }

  const json = (await response.json()) as { result?: string };
  if (!json.result) {
    return undefined;
  }

  const decoded = decode(json.result);
  if (decoded === undefined || decoded === null) return undefined;

  return {
    value: decoded,
    status: "yes",
    provenance: "chain",
    evidence: {
      signature,
      result: json.result,
    },
  };
}

export async function readERC20Fields(
  config: AnalyzerRpcConfig,
  target: Address
): Promise<ERC20FieldSet> {
  const results: Partial<ERC20FieldSet> = {};

  for (const key of Object.keys(erc20MethodMap) as ERC20FieldKeys[]) {
    const field = await callERC20Field(config, target, key);
    if (field) {
      if (key === "decimals" && typeof field.value === "number") {
        results.decimals = field as SnapshotField<number>;
      } else if (key === "name" && typeof field.value === "string") {
        results.name = field as SnapshotField<string>;
      } else if (key === "symbol" && typeof field.value === "string") {
        results.symbol = field as SnapshotField<string>;
      } else if (key === "totalSupply" && typeof field.value === "string") {
        results.totalSupply = field as SnapshotField<string>;
      }
    } else {
      if (key === "decimals") {
        results.decimals = toSnapshotField("chain", 0, erc20FieldDefaults[key]);
      } else {
        results[key] = toSnapshotField("chain", "", erc20FieldDefaults[key]) as SnapshotField<string>;
      }
    }
  }

  return results;
}

const proxyStorageSlots = {
  implementation: "0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC",
  admin: "0xb53127684a568b3173ae13b9f8a6016cc2c8c3de7afabdb7a386e238f1e7a2a6",
};

async function readStorageSlot(
  config: AnalyzerRpcConfig,
  target: Address,
  slot: string
): Promise<string | undefined> {
  const payload = {
    jsonrpc: "2.0",
    method: "eth_getStorageAt",
    params: [target, slot, "latest"],
    id: 1,
  };

  const response = await fetch(config.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return undefined;
  }

  const json = (await response.json()) as { result?: string };
  return json.result;
}

export async function detectProxySlots(
  config: AnalyzerRpcConfig,
  target: Address
): Promise<ProxySlotResult> {
  const implementationRaw = await readStorageSlot(config, target, proxyStorageSlots.implementation);
  const adminRaw = await readStorageSlot(config, target, proxyStorageSlots.admin);

  const toField = (raw: string | undefined): SnapshotField<Address | null> => {
    const cleaned = raw ? (normalizeAddressFromStorageSlot(raw) as Address | null) : null;
    return {
      value: cleaned,
      status: cleaned ? "yes" : "no",
      provenance: "chain",
      evidence: raw ? { raw } : undefined,
    };
  };

  return {
    implementation: toField(implementationRaw),
    admin: toField(adminRaw),
  };
}
