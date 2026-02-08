import type { Address, SnapshotField } from "@verisnap/core";
import type { BaseScanConfig, BaseScanResult } from "../types";

type BaseScanResponse = {
  status: string;
  message: string;
  result: Array<Record<string, string>>;
};

const DEFAULT_BASESCAN_URL = "https://api.basescan.org/api";

export async function fetchBaseScanSource({
  contractAddress,
  config,
}: {
  contractAddress: Address;
  config: BaseScanConfig;
}): Promise<BaseScanResult> {
  const baseUrl = config.baseUrl?.trim() || DEFAULT_BASESCAN_URL;
  const apiKey = config.apiKey?.trim() || "";

  const url = new URL(baseUrl);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", contractAddress);
  if (apiKey) url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return {
      isVerified: false,
      message: `BaseScan request failed (${response.status})`,
    };
  }

  const data = (await response.json()) as BaseScanResponse;
  const row = data.result?.[0];
  if (!row) {
    return {
      isVerified: false,
      message: "BaseScan returned no result rows",
      evidence: { status: data.status, message: data.message },
    };
  }

  const abi = row.ABI || "";
  const source = row.SourceCode || "";
  const unverifiedSentinel = "Contract source code not verified";
  const abiAvailable = !!abi && abi !== unverifiedSentinel;
  const sourceAvailable = !!source;
  const isVerified = abiAvailable || sourceAvailable;

  return {
    isVerified,
    abi: abiAvailable ? abi : undefined,
    source: sourceAvailable ? source : undefined,
    message: data.message,
    evidence: {
      basescanStatus: data.status,
      basescanMessage: data.message,
      contractName: row.ContractName,
      compilerVersion: row.CompilerVersion,
      proxy: row.Proxy,
      implementation: row.Implementation,
    },
  };
}

export function toVerificationFields(
  result: BaseScanResult
): {
  isVerified: SnapshotField<boolean>;
  abiAvailable: SnapshotField<boolean>;
  sourceAvailable: SnapshotField<boolean>;
} {
  const evidence = result.evidence ?? {};
  return {
    isVerified: {
      value: result.isVerified,
      status: "yes",
      provenance: "basescan",
      evidence,
    },
    abiAvailable: {
      value: !!result.abi,
      status: "yes",
      provenance: "basescan",
      evidence,
    },
    sourceAvailable: {
      value: !!result.source,
      status: "yes",
      provenance: "basescan",
      evidence,
    },
  };
}

