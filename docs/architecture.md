# Architecture (V1)

## High-level flow

1. User enters token contract address on Base.
2. System generates a draft snapshot from:
   - Onchain reads via Base RPC
   - BaseScan verification metadata (primary)
   - Sourcify (fallback; fills missing only)
3. Publishing creates an immutable version:
   - Store canonical snapshot JSON + hash in Supabase (Postgres)
   - Pin snapshot JSON to IPFS (Pinata) and store CID
4. Viewers can:
   - Toggle plain-language vs raw
   - Verify integrity (hash check)
   - Compare versions (history + diff)
5. Watch Mode is required:
   - Double opt-in email
   - Cron polling via Vercel → detect changes → publish new version → notify watchers

## Monorepo boundaries

- `apps/web` (A4): UI + public pages + route handlers (cron endpoints live here)
- `packages/worker` (A2): polling/notifications orchestration logic used by route handlers
- `packages/analyzer` (A2): Base RPC + BaseScan/Sourcify ingestion + normalization (library)
- `packages/core` (A3): canonical snapshot types + hashing/verify spec (library)
- `packages/db` (A1): schema review + shared DB access helpers (library)

