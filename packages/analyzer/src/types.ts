import type { Address, LaunchSnapshot, Provenance, SnapshotField } from "@verisnap/core";

export type AnalyzerRpcConfig = {
  rpcUrl: string;
  chainId: number;
};

export type ERC20FieldKeys = "name" | "symbol" | "decimals" | "totalSupply";

export type ERC20FieldSet = {
  name?: SnapshotField<string>;
  symbol?: SnapshotField<string>;
  decimals?: SnapshotField<number>;
  totalSupply?: SnapshotField<string>;
};

export type ProxySlotResult = {
  implementation: SnapshotField<Address | null>;
  admin: SnapshotField<Address | null>;
};

export type ExplorerEvidence = {
  value: string;
  provenance: Provenance;
  source: "basescan" | "sourcify";
};

export type VerificationFields = {
  isVerified: SnapshotField<boolean>;
  abiAvailable: SnapshotField<boolean>;
  sourceAvailable: SnapshotField<boolean>;
};

export type AnalyzerSnapshot = {
  chainId: number;
  contractAddress: Address;
  observedAt: string;
  token?: LaunchSnapshot["token"];
  proxy?: LaunchSnapshot["proxy"];
  verification?: VerificationFields;
};

export type AnalyzerWatchFields = {
  proxyImplementation?: SnapshotField<Address | null>;
  proxyAdmin?: SnapshotField<Address | null>;
  totalSupply?: SnapshotField<string>;
  verification?: VerificationFields;
};

export type BaseScanResult = {
  isVerified: boolean;
  abi?: string;
  source?: string;
  message?: string;
  evidence?: Record<string, unknown>;
};

export type SourcifyResult = {
  abi?: string;
  source?: string;
  evidence?: Record<string, unknown>;
};

export type ExplorerMergeResult = {
  verification: VerificationFields;
  evidence: {
    abi?: ExplorerEvidence;
    source?: ExplorerEvidence;
    message?: string;
  };
};
