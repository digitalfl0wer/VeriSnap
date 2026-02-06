# TASKS.md — LaunchReceipt V1

Status legend: TODO | IN_PROGRESS | IN_REVIEW | DONE | BLOCKED  
Owner legend: A1 | A2 | A3 | A4  
Rule: update this file every time a task changes state.

## EPIC 0 — Project setup + Supabase foundation

- (DONE | A1) Create Supabase project + env vars + local config docs — documented env conventions in `docs/env.md` and expanded `supabase/README.md`.
- (DONE | A1) Define RLS policy plan (public read for published snapshots; private for watchers) — filled out `docs/rls-plan.md` with per-table policies and service-role guidance.
- (DONE | A1) Create initial DB migrations: projects, snapshots, diffs, watchers, watch_runs — added `supabase/migrations/0001_create_tables.sql` with schema + triggers.
- (DONE | A1) Seed demo project records (2–3 sample tokens) — added `supabase/seeds/demo-plan.md` describing the demo data plan.

## EPIC 1 — Analyzer (ERC-20 + proxy detection)

- (IN_PROGRESS | A2) Contract existence check (code present) — started RPC helper scaffolding
- (IN_PROGRESS | A2) ERC-20 reads: name/symbol/decimals/totalSupply — building field wrappers
- (IN_PROGRESS | A2) Proxy detection via standard storage slot checks (implementation/admin) — slot lookups planned
- (IN_PROGRESS | A2) Build “watch fields” extraction object (minimal set) — combining reads/provenance
- (IN_PROGRESS | A2) Persist provenance per field (chain/explorer/fallback/builder) — aligning SnapshotField exports

## EPIC 2 — Explorer ingestion (BaseScan primary, Sourcify fallback)

- (IN_PROGRESS | A2) BaseScan fetch module (verified status + ABI/source availability) — API client drafting
- (IN_PROGRESS | A2) Sourcify fallback module (only when BaseScan missing/unverified) — fallback parser outlined
- (IN_PROGRESS | A2) Merge policy implementation (fill missing only; surface conflicts) — field merging strategy in flight

## EPIC 3 — Canonical JSON + hashing + verify

- (TODO | A3) Define canonicalization rules (key ordering, address normalization, numeric normalization)
- (TODO | A3) Implement hash: keccak256(canonical_json)
- (TODO | A3) Implement verify routine (recompute hash → compare → return status + evidence)

## EPIC 4 — Publish pipeline (DB + IPFS)

- (TODO | A2) Save draft snapshot → publish creates immutable version
- (TODO | A2) IPFS pin snapshot JSON and store CID (fallback-friendly)
- (TODO | A2) Store “latest” pointer per project
- (TODO | A2) Generate permalink + latest URLs

## EPIC 5 — Watch Mode required + email double opt-in

- (IN_PROGRESS | A2) Create watcher subscribe endpoint (status=pending + verify token) — library interfaces in progress
- (IN_PROGRESS | A2) Send verification email (include verify + unsubscribe links) — templated payloads being defined
- (IN_PROGRESS | A2) Verify endpoint flips watcher to verified — token validation helpers drafted
- (IN_PROGRESS | A2) Unsubscribe endpoint (idempotent) — idempotency plan set
- (IN_PROGRESS | A2) Polling worker (cron): selects due projects by adaptive schedule; re-checks watch fields; on change: new snapshot + diff + notify — orchestration helpers underway
- (IN_PROGRESS | A2) Adaptive schedule logic (age tiers + risk override) + “Check now” endpoint (rate-limited) — scheduling/rate limiter being outlined

## EPIC 6 — Receipt-first UI (LaunchReceipt)

- (DONE | A4) Receipt component (header, line items, footer, QR)
- (DONE | A4) Plain language templates + raw toggle UI
- (DONE | A4) “Copy hash / copy CID” actions
- (DONE | A4) Print / save-as-PDF (browser print)
 - (TODO | A4) Draft flow UI (address → draft receipt)
 - (TODO | A4) Publish flow UI (review → publish → share links)
 - (TODO | A4) Verify UI (shows result from A3 verify routine)
- (DONE | A4) History timeline UI (versions list)
- (DONE | A4) Diff UI (vN vs vN-1)

## EPIC 7 — Prechecklist (one-stop shop)

- (DONE | A4) Prechecklist UI section (present/missing; 3 optional builder fields)
- (TODO | A2) Prechecklist data builder (auto-detected + builder input slots)

## EPIC 8 — QA + demo readiness

- (TODO | A1) Demo script: create → publish → verify → watch email → diff
- (TODO | A1) Failure-mode polish (BaseScan down, IPFS slow, unknown signals)
- (TODO | A1) “Known limitations” doc (no verdicts, deterministic only)

## EPIC 9 — V2 parking lot (do not implement in V1)

- (TODO | A1) Suggested improvements (optional section)
- (TODO | A1) Log/event watching
- (TODO | A1) Arweave publish
- (TODO | A1) Embed widget/badge
- (TODO | A1) Builder claim via signature
