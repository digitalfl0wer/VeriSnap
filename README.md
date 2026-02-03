# Veri Snap — LaunchReceipt (V1)

Public, shareable, versioned “receipts” for ERC-20 token launches on Base.

## Monorepo layout

- `apps/web` — Next.js app (UI + route handlers)
- `packages/core` — shared types (canonical snapshot shape)
- `packages/analyzer` — onchain + explorer ingestion (placeholder)
- `packages/worker` — polling + notifications (placeholder)
- `packages/db` — DB access layer (placeholder)

## Local dev

### 1) Install deps

```bash
pnpm install
```

### 2) Environment

Copy env example and fill values:

```bash
cp apps/web/.env.example apps/web/.env.local
```

### 3) Run web app

```bash
pnpm dev
```

## Docs

- `PRD.md` — product requirements (canon)
- `TASKS.md` — task tracker (update on every state change)
- `docs/architecture.md` — high-level architecture notes

