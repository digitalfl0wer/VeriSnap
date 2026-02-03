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

