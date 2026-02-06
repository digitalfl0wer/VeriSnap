# @verisnap/core

Shared, versioned types and utilities for LaunchReceipt snapshots.

Ownership: A3 (Canonical JSON + hashing + verify).

## Canonical JSON spec
- Trim all strings and normalize addresses (lowercase hex with `0x` prefix) and timestamps (ISO 8601 via `Date.toISOString()`).
- Remove keys whose value becomes `undefined` due to normalization or absence (i.e., omit missing fields).
- Sort every object’s keys lexicographically before serialization.
- Arrays preserve order but drop elements that normalize to `undefined`.
- Numbers must be finite (`NaN`, `Infinity`, `-Infinity` rejected); `-0` becomes `0`.
- Serialization uses `JSON.stringify` on the resulting canonical structure. These rules ensure deterministic keccak256 hashing of snapshots.
