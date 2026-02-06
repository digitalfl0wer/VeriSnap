-- 0001_create_tables.sql
-- LaunchReceipt V1 schema snapshot

-- General helpers
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- projects: one per token/contract
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  contract_address text NOT NULL UNIQUE,
  network text NOT NULL DEFAULT 'base',
  watch_enabled boolean NOT NULL DEFAULT true,
  watch_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- snapshots: canonical JSON per published version
CREATE TABLE IF NOT EXISTS snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version integer NOT NULL,
  canonical_json jsonb NOT NULL,
  canonical_hash text NOT NULL,
  state text NOT NULL DEFAULT 'published' CHECK (state IN ('draft', 'published')),
  ipfs_cid text,
  pinned_at timestamptz,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

-- diffs: results of comparing consecutive snapshots
CREATE TABLE IF NOT EXISTS diffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_id uuid NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  previous_snapshot_id uuid REFERENCES snapshots(id) ON DELETE SET NULL,
  diff jsonb NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- watchers: email subscribers (private info only accessible to server)
CREATE TABLE IF NOT EXISTS watchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email text NOT NULL,
  email_normalized text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'unsubscribed')),
  verification_token text NOT NULL,
  verification_sent_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  unsubscribe_token text NOT NULL,
  notification_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, email_normalized)
);

-- watch_runs: cron history + diff references
CREATE TABLE IF NOT EXISTS watch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'success', 'no_change', 'error')),
  snapshot_id uuid REFERENCES snapshots(id) ON DELETE SET NULL,
  diff_id uuid REFERENCES diffs(id) ON DELETE SET NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helper trigger for updated_at bookkeeping
CREATE OR REPLACE FUNCTION update_timestamp()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER snapshots_updated_at
  BEFORE UPDATE ON snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER watchers_updated_at
  BEFORE UPDATE ON watchers
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER watch_runs_updated_at
  BEFORE UPDATE ON watch_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();
