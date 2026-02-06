## Supabase demo seed plan

### Goal

Seed the foundational tables with 2–3 demo LaunchReceipt projects so that the
front end can load snapshots/diffs without requiring live data. This plan is a
guide; the actual seed script can be a SQL file or a Supabase CLI seed when A2
implements it.

### When to run

1. Ensure Supabase CLI is installed and `supabase` is logged in with a project
   (or use `psql` against your dev database).
2. Apply `supabase/migrations/0001_create_tables.sql`.
3. Source `.env`/`.env.local` so the service role key is available if using CLI.

### Seed data outline

1. **projects**
   - `genesis` – contract address `0x...`, name “LaunchReceipt Genesis”.
   - `orbit` – contract address `0x...`, name “LaunchReceipt Orbit”.
   - `polaris` – contract address `0x...`, name “LaunchReceipt Polaris”.
   - `watch_fields` set to the minimal list from `PRD.md` (proxy, admin, owner, verification, totalSupply).
2. **snapshots**
   - Each project gets a version 1 snapshot with `canonical_json` matching the
     expected receipt structure (contract info, watch flags, status line items).
   - `canonical_hash` is a mock string like `hash_demo_v1` (the real worker will
     compute it).
3. **diffs**
   - Provide a diff entry that compares version 1 → 2 for at least one project.
   - `diff` JSON should highlight changed fields (e.g., `{"upgraded": true}`).
4. **watchers**
   - Leave empty; real watchers start as pending/verifiers from the UI/cron.
5. **watch_runs**
   - Insert a placeholder entry for the latest polling job (`status: success`,
     `result: { "checked": true }`).

### Example command (psql)

```sh
psql "$SUPABASE_DB_URL" -f supabase/seeds/demo-data.sql
```

### Follow-up

- When the supabase CLI seed script exists, replace `demo-plan.md` references
  with the actual command (e.g., `supabase db seed --file seeds/demo-data.sql`)
  and drop `demo-data.sql` into this directory.
