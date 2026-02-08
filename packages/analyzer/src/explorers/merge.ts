import type { ExplorerMergeResult, ExplorerEvidence, VerificationFields } from "../types";
import type { SnapshotField } from "@verisnap/core";

type FieldKey = keyof VerificationFields;

export function mergeVerificationFields({
  basescan,
  sourcify,
}: {
  basescan?: VerificationFields;
  sourcify?: VerificationFields;
}): ExplorerMergeResult {
  const evidence: ExplorerMergeResult["evidence"] = {};

  const merged: VerificationFields = {
    isVerified: mergeField("isVerified", basescan?.isVerified, sourcify?.isVerified),
    abiAvailable: mergeField("abiAvailable", basescan?.abiAvailable, sourcify?.abiAvailable),
    sourceAvailable: mergeField("sourceAvailable", basescan?.sourceAvailable, sourcify?.sourceAvailable),
  };

  if (basescan?.abiAvailable) evidence.abi = toEvidence(basescan.abiAvailable, "basescan");
  else if (sourcify?.abiAvailable) evidence.abi = toEvidence(sourcify.abiAvailable, "sourcify");

  if (basescan?.sourceAvailable) evidence.source = toEvidence(basescan.sourceAvailable, "basescan");
  else if (sourcify?.sourceAvailable) evidence.source = toEvidence(sourcify.sourceAvailable, "sourcify");

  if (hasConflict(merged)) {
    evidence.message = "Explorer sources disagree; BaseScan wins but conflicts are surfaced.";
  }

  return { verification: merged, evidence };
}

function mergeField<T>(
  _key: FieldKey,
  basescan?: SnapshotField<T>,
  sourcify?: SnapshotField<T>
): SnapshotField<T> {
  if (basescan && sourcify) {
    if (Object.is(basescan.value, sourcify.value)) return basescan;
    return {
      value: basescan.value,
      status: "conflict",
      provenance: "derived",
      evidence: {
        basescan,
        sourcify,
      },
    };
  }

  return basescan ?? sourcify ?? ({ value: undefined as T, status: "unknown", provenance: "derived" } as SnapshotField<T>);
}

function toEvidence<T>(field: SnapshotField<T>, source: ExplorerEvidence["source"]): ExplorerEvidence {
  return {
    value: String(field.value),
    provenance: field.provenance,
    source,
  };
}

function hasConflict(fields: VerificationFields): boolean {
  return (
    fields.isVerified.status === "conflict" ||
    fields.abiAvailable.status === "conflict" ||
    fields.sourceAvailable.status === "conflict"
  );
}

