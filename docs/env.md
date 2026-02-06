# Environment variables

This project separates browser-exposed configuration (`NEXT_PUBLIC_*`) from
server-side secrets (Supabase service role, cron tokens, email/pinning
providers). Secrets are safe to load in server runtimes (Next.js route handlers,
workers, cron) but must never be referenced in client bundles.

## .env files & inheritance

- The repo-root `.env.example` is the best single template for local dev across
  the repo. Copy it to `apps/web/.env.local` for Next.js dev, and/or to
  `.env.local` (repo root) when running scripts/cron from the workspace root.
- `apps/web/.env.example` is a convenience template scoped to the Next.js app.
  It may include both public keys and server-only secrets; only `NEXT_PUBLIC_*`
  values can be exposed to the browser bundle.
- Never commit `.env.local`, `.env.*.local`, or the values from the real
  `.env`. The `.gitignore` already blocks them.

## Key meanings

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: used by the
  frontend (`apps/web`) to read published snapshots/diffs via the public
  policies defined in `docs/rls-plan.md`. These can be safely shipped with the
  production deployment.
- `SUPABASE_SERVICE_ROLE_KEY`: required for any server process that writes to
  Supabase (publishing snapshots, inserting watchers, running cron jobs, seeding
  data). This key bypasses RLS and must never reach the browser.
- `RESEND_API_KEY`: server-only key to send watcher verification emails.
- `PINATA_JWT`: server-only key for pinning snapshot JSON to IPFS. Cron or
  publish flows use this when storing CIDs.
- `BASE_RPC_URL` / `BASESCAN_API_KEY`: used by the analyzer worker in packages
  to query on-chain data and BaseScan metadata.
- `CRON_SECRET`: used by the polling cron endpoint to validate the incoming
  scheduled requests from your deployment platform.

## Local setup checklist

1. `pnpm install` (root workspace). The apps/ and packages/ folders share
   dependencies via the workspace config.
2. `cp .env.example apps/web/.env.local` (or start from `apps/web/.env.example`)
   and fill in the real values you need.
3. Copy the root `.env.example` to `.env.local` (or `.env`) before you run
   server/cron commands from the repo root. Keep the service role key tucked in
   a password manager.
4. Run `pnpm dev` from `apps/web` to start the front-end; use the anon keys in
   `.env.local`.
5. Run cron/publish workflows using `SUPABASE_SERVICE_ROLE_KEY` like:

   ```sh
   SUPABASE_SERVICE_ROLE_KEY=... pnpm --filter worker dev
   ```

6. When the database exists, reference `supabase/seeds/demo-plan.md` for the
   two-to-three demo tokens and watch how to run the seed plan.

## Seeding notes

After creating the Supabase schema (see `supabase/migrations/0001_create_tables.sql`):

- Use the Supabase CLI (`supabase db push`) or `psql` with your local database
  URL to materialize the tables.
- Run the steps in `supabase/seeds/demo-plan.md` to insert the three demo
  projects/snapshots and confirm the `watchers` table starts empty.
- Keep the seed fixtures in version control so teammates can reproduce the
  demo tokens exactly.
