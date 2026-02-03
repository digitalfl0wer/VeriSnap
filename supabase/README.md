# Supabase

This directory holds the database-side artifacts that support LaunchReceipt V1:

- `migrations/` – SQL-first migration planning for the core tables.
- `seeds/` – demo data (projects, snapshots, watchers) to populate a fresh Supabase instance.
- `README.md` – this document, plus linked notes in `docs/`.

## V1 tables (per PRD / TASKS)

- `projects`
- `snapshots`
- `diffs`
- `watchers`
- `watch_runs`

## Next steps

- Run `supabase db push` or `psql` against `supabase/migrations/0001_create_tables.sql` to create the schema.
- Use `supabase/seeds/demo-plan.md` to load 2–3 demo tokens after the schema exists (seed plan notes the command/fixtures).
- Enforce RLS via the policies documented in `docs/rls-plan.md`.

