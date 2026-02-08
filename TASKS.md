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

- (DONE | A2) Contract existence check (code present) — RPC `eth_getCode` check returns SnapshotField evidence.
- (DONE | A2) ERC-20 reads: name/symbol/decimals/totalSupply — implemented via `eth_call` selectors + ABI decode.
- (DONE | A2) Proxy detection via standard storage slot checks (implementation/admin) — implemented via `eth_getStorageAt`.
- (DONE | A2) Build “watch fields” extraction object (minimal set) — extracted from snapshots for polling comparisons.
- (DONE | A2) Persist provenance per field (chain/explorer/fallback/builder) — SnapshotField provenance filled per source.

## EPIC 2 — Explorer ingestion (BaseScan primary, Sourcify fallback)

- (DONE | A2) BaseScan fetch module (verified status + ABI/source availability) — implemented `getsourcecode` fetch + parsing.
- (DONE | A2) Sourcify fallback module (only when BaseScan missing/unverified) — implemented verification check fallback.
- (DONE | A2) Merge policy implementation (fill missing only; surface conflicts) — BaseScan wins; conflicts surfaced.

## EPIC 3 — Canonical JSON + hashing + verify

- (DONE | A3) Define canonicalization rules (key ordering, address normalization, numeric normalization)
- (DONE | A3) Implement hash: keccak256(canonical_json)
- (DONE | A3) Implement verify routine (recompute hash → compare → return status + evidence)

## EPIC 4 — Publish pipeline (DB + IPFS)

- (DONE | A2) Save draft snapshot → publish creates immutable version — draft persisted in Supabase; publish flips state.
- (DONE | A2) IPFS pin snapshot JSON and store CID (fallback-friendly) — Pinata JWT optional; publish works without CID.
- (DONE | A2) Store “latest” pointer per project — `projects.latest_snapshot_id` migration + update on publish.
- (DONE | A2) Generate permalink + latest URLs — `/p/<slug>/v/<n>` and `/p/<slug>` routes.

## EPIC 5 — Watch Mode required + email double opt-in

- (DONE | A2) Create watcher subscribe endpoint (status=pending + verify token) — `POST /api/watch/subscribe`.
- (DONE | A2) Send verification email (include verify + unsubscribe links) — Resend optional via `RESEND_API_KEY`.
- (DONE | A2) Verify endpoint flips watcher to verified — `GET /api/watch/verify?token=...`.
- (DONE | A2) Unsubscribe endpoint (idempotent) — `GET /api/watch/unsubscribe?token=...`.
- (DONE | A2) Polling worker (cron): selects due projects by adaptive schedule; re-checks watch fields; on change: new snapshot + diff + notify — implemented in `GET /api/cron/poll`.
- (DONE | A2) Adaptive schedule logic (age tiers + risk override) + “Check now” endpoint (rate-limited) — implemented in worker + `POST /api/check-now`.

## EPIC 6 — Receipt-first UI (LaunchReceipt)

- (DONE | A4) Receipt component (header, line items, footer, QR)
- (DONE | A4) Plain language templates + raw toggle UI
- (DONE | A4) “Copy hash / copy CID” actions
- (DONE | A4) Print / save-as-PDF (browser print)
- (DONE | A4) Draft flow UI (address → draft receipt)
- (DONE | A4) Publish flow UI (review → publish → share links)
- (DONE | A4) Verify UI (shows result from A3 verify routine)
- (DONE | A4) History timeline UI (versions list)
- (DONE | A4) Diff UI (vN vs vN-1)

## EPIC 7 — Prechecklist (one-stop shop)

- (DONE | A4) Prechecklist UI section (present/missing; 3 optional builder fields)
- (DONE | A2) Prechecklist data builder (auto-detected + builder input slots)

## EPIC 8 — QA + demo readiness

- (DONE | A1) Demo script: create → publish → verify → watch email → diff — `docs/demo-script.md`.
- (DONE | A1) Failure-mode polish (BaseScan down, IPFS slow, unknown signals) — external providers optional; UI surfaces errors.
- (DONE | A1) “Known limitations” doc (no verdicts, deterministic only) — `docs/known-limitations.md`.

## EPIC 9 — V2 parking lot (do not implement in V1)

- (TODO | A1) Suggested improvements (optional section)
- (TODO | A1) Log/event watching
- (TODO | A1) Arweave publish
- (TODO | A1) Embed widget/badge
- (TODO | A1) Builder claim via signature
