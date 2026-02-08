-- 0002_project_latest_pointer_and_rls.sql
-- Adds "latest snapshot" pointer and enables basic RLS for public reads.

-- Track latest published snapshot for fast "latest" lookups.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS latest_snapshot_id uuid REFERENCES snapshots(id) ON DELETE SET NULL;

-- Enable RLS (service role bypasses RLS automatically).
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE diffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_runs ENABLE ROW LEVEL SECURITY;

-- Public can read projects (metadata should remain non-sensitive).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND policyname = 'public_read_projects'
  ) THEN
    CREATE POLICY public_read_projects
      ON projects
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Public can read published snapshots only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'snapshots'
      AND policyname = 'public_read_published_snapshots'
  ) THEN
    CREATE POLICY public_read_published_snapshots
      ON snapshots
      FOR SELECT
      USING (state = 'published');
  END IF;
END $$;

-- Public can read diffs only if they relate to a published snapshot.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'diffs'
      AND policyname = 'public_read_diffs_for_published'
  ) THEN
    CREATE POLICY public_read_diffs_for_published
      ON diffs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM snapshots s
          WHERE s.id = diffs.snapshot_id
            AND s.state = 'published'
        )
      );
  END IF;
END $$;

-- No public policies for watchers/watch_runs by default.
