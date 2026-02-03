import type { Address, SnapshotField, TruthStatus } from "@verisnap/core";
import type { AnalyzerRpcConfig, ERC20FieldKeys, ERC20FieldSet, ProxySlotResult } from "./types";

const toSnapshotField =
  <T>(provenance: SnapshotField<T>["provenance"]) =>
  (value: T, status: TruthStatus): SnapshotField<T> =>
    ({
      value,
      status,
      provenance,
    } as SnapshotField<T>);

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

  return toSnapshotField("chain")(exists, exists ? "yes" : "no");
}

const erc20FieldDefaults: Record<ERC20FieldKeys, SnapshotField<string>["status"]> = {
  name: "unknown",
  symbol: "unknown",
  decimals: "unknown",
  totalSupply: "unknown",
};

const erc20MethodMap: Record<ERC20FieldKeys, string> = {
  name: "name()",
  symbol: "symbol()",
  decimals: "decimals()",
  totalSupply: "totalSupply()",
};

async function callERC20Field(
  config: AnalyzerRpcConfig,
  target: Address,
  key: ERC20FieldKeys
): Promise<SnapshotField<string> | undefined> {
  const { rpcUrl } = config;

  const payload = {
    jsonrpc: "2.0",
    method: "eth_call",
    params: [
      {
        to: target,
        data: `${encodeMethodCall(erc20MethodMap[key])}`,
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

  return {
    value: decodeMethodResult(json.result),
    status: "yes",
    provenance: "chain",
  };
}

function encodeMethodCall(signature: string): string {
  const hash = crypto.subtle.keccak256(new TextEncoder().encode(signature));
  throw new Error("Not implemented");
}

function decodeMethodResult(_data: string): string {
  throw new Error("Not implemented");
}

export async function readERC20Fields(
  config: AnalyzerRpcConfig,
  target: Address
): Promise<ERC20FieldSet> {
  const results: Partial<ERC20FieldSet> = {};

  for (const key of Object.keys(erc20MethodMap) as ERC20FieldKeys[]) {
    const field = await callERC20Field(config, target, key);
    if (field) {
      results[key] = field;
    } else {
      results[key] = {
        value: "",
        status: erc20FieldDefaults[key],
        provenance: "chain",
      };
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
    const cleaned = raw && raw !== "0x" ? (`0x${raw.slice(2).padStart(40, "0")}` as Address) : null;
    return {
      value: cleaned,
      status: cleaned ? "yes" : "no",
      provenance: "chain",
    };
  };

  return {
    implementation: toField(implementationRaw),
    admin: toField(adminRaw),
  };
}
