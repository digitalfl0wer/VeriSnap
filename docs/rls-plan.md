# RLS plan (V1)

## Goals

- Allow the public web UI (`apps/web`) to **read published** snapshots, their
  parent project metadata, and associated diffs while keeping drafts/behind-the-
  scene history private.
- Treat watcher emails as private data accessible only to server-side processes
  (publish, cron, email verification) running with `SUPABASE_SERVICE_ROLE_KEY`.
- Restrict writes across the board to the service role so that only backend
  workers can mutate snapshots, diffs, watchers, or watch runs.

## General policy notes

1. Every table listed below must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
2. Public-facing policies rely on `auth.role()` (Supabase helper that returns the
   JWT role, e.g. `anon` vs `authenticated`). Server-only policies check for
   `auth.role() = 'service_role'`.
3. We keep watcher-related operations inside server endpoints, so the frontend
   never runs direct SQL against `watchers` or `watch_runs`.

## Table-by-table plan

### `projects`

- `SELECT`: `CREATE POLICY "Public projects" ON projects FOR SELECT USING
  (watch_enabled);`
  - This lets the UI list only watch-enabled launches. Additional filters can be
    applied (e.g. slug) in the query layer.
  - The policy also allows `project` metadata to reach the client when a
    published snapshot is requested.
- `INSERT`, `UPDATE`, `DELETE`: `auth.role() = 'service_role'`.
  - Whenever builders publish a new token or update watch fields, the worker
    uses the service role key.

### `snapshots`

- `SELECT`: allow only published snapshots and tie them to active projects.
  ```
  CREATE POLICY "Published snapshots" ON snapshots FOR SELECT USING (
    state = 'published' AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = snapshots.project_id AND projects.watch_enabled
    )
  );
  ```
  - The UI fetches canonical JSON + hash only when a snapshot has been published.
- `INSERT`, `UPDATE`, `DELETE`: only the service role may mutate snapshots (publishes, diffs, pin updates).

### `diffs`

- `SELECT`: allow viewing diffs when the snapshot they reference is published.
  ```
  CREATE POLICY "Diffs for published snapshots" ON diffs FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM snapshots
      WHERE snapshots.id = diffs.snapshot_id AND snapshots.state = 'published'
    )
  );
  ```
- `INSERT`, `UPDATE`, `DELETE`: locked to `auth.role() = 'service_role'`.

### `watchers`

- `SELECT`: no public or authenticated access, so the policy can be `USING (false)`
  or simply omitted (Supabase defaults to denying access when no policy applies).
- `INSERT`, `UPDATE`, `DELETE`: service role only.
  - Watcher sign-ups, verifications, and unsubscribes run through API routes/cron
    jobs that use the service key.
  - Tokens (`verification_token`, `unsubscribe_token`) should be hashed before
    insert to prevent accidental leaks; consider calling `digest(token, 'sha256')`
    or storing deterministically derived values.

### `watch_runs`

- Entirely server-only. No public policies.
- Only insert/update via cron flow (`auth.role() = 'service_role'`).
  - The polling worker logs status + diff references here so we can surface
    health info inside internal dashboards if needed.

## Verification checklist

- [ ] Supabase CLI `supabase db push` enables RLS + policies.
- [ ] Policy SQL lives with the migrations (e.g. a future `0002_policies.sql`).
- [ ] Front-end requests go via anon role and only see `state = 'published'` data.
- [ ] Server jobs authenticate with `SUPABASE_SERVICE_ROLE_KEY` and bypass RLS.

