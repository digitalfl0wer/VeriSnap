import type { Address, SnapshotField } from "@verisnap/core";
import type { SourcifyConfig, SourcifyResult } from "../types";

type SourcifyCheckResponseItem = {
  address: string;
  chainId: string;
  status: "perfect" | "partial" | "false";
};

const DEFAULT_SOURCIFY_URL = "https://sourcify.dev/server";

export async function checkSourcifyVerification({
  chainId,
  contractAddress,
  config,
}: {
  chainId: number;
  contractAddress: Address;
  config: SourcifyConfig;
}): Promise<SourcifyResult> {
  const baseUrl = config.serverUrl?.trim() || DEFAULT_SOURCIFY_URL;
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/check-by-addresses`);
  url.searchParams.set("chainIds", String(chainId));
  url.searchParams.set("addresses", contractAddress);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return { evidence: { status: response.status } };
  }

  const data = (await response.json()) as SourcifyCheckResponseItem[];
  const row = data?.[0];
  if (!row) {
    return { evidence: { message: "Sourcify returned no rows" } };
  }

  const isVerified = row.status === "perfect" || row.status === "partial";
  return {
    evidence: {
      status: row.status,
      chainId: row.chainId,
      address: row.address,
    },
    abi: isVerified ? "available_via_sourcify" : undefined,
    source: isVerified ? "available_via_sourcify" : undefined,
  };
}

export function toVerificationFields(
  result: SourcifyResult
): {
  isVerified: SnapshotField<boolean>;
  abiAvailable: SnapshotField<boolean>;
  sourceAvailable: SnapshotField<boolean>;
} {
  const verified = !!(result.abi || result.source);
  const evidence = result.evidence ?? {};

  return {
    isVerified: {
      value: verified,
      status: "yes",
      provenance: "sourcify",
      evidence,
    },
    abiAvailable: {
      value: verified,
      status: "yes",
      provenance: "sourcify",
      evidence,
    },
    sourceAvailable: {
      value: verified,
      status: "yes",
      provenance: "sourcify",
      evidence,
    },
  };
}
