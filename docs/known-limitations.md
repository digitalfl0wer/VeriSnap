# Known limitations (V1)

This doc is intentionally conservative: Veri Snap is a deterministic snapshot tool, not a safety oracle.

## No safety verdicts

- LaunchReceipt does **not** label tokens as “safe” or “unsafe”.
- It only captures evidence (chain + explorer) with provenance and versioning.

## Explorer dependency caveats

- BaseScan is treated as the primary source for verification/ABI/source availability.
- Sourcify is used only as a fallback and can disagree with BaseScan; disagreements are surfaced as `conflict`.
- Explorer APIs can rate-limit or return partial data.

## On-chain reads are best-effort

- Some contracts revert or use non-standard ERC-20 return types; reads may fall back to `unknown`.
- Proxy detection is based on common storage slots and does not cover every proxy pattern.

## Watch Mode is polling

- V1 uses polling, not event subscriptions.
- Poll intervals are coarse and age-based; “Check now” is rate-limited and not guaranteed to run immediately in all deployments.

## Privacy scope

- The only user data stored in V1 is watcher emails (private via RLS).
- Do not store secrets or sensitive identifiers in project metadata.

