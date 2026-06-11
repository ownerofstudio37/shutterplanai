-- Phase 3 hardening pass for planner tables.
-- Safe to run multiple times.

-- Ensure RLS is enabled consistently.
ALTER TABLE IF EXISTS planner_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS planner_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS planner_analytics ENABLE ROW LEVEL SECURITY;

-- Force RLS on exports because this table should only be accessed via server-side service role.
ALTER TABLE IF EXISTS planner_exports FORCE ROW LEVEL SECURITY;

-- Recreate cleanup function idempotently.
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS void AS $$
BEGIN
  DELETE FROM planner_exports WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Draft policies (guarded create).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'planner_drafts') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'planner_drafts'
        AND policyname = 'Users can view their own drafts'
    ) THEN
      CREATE POLICY "Users can view their own drafts"
        ON planner_drafts
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'planner_drafts'
        AND policyname = 'Users can create their own drafts'
    ) THEN
      CREATE POLICY "Users can create their own drafts"
        ON planner_drafts
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'planner_drafts'
        AND policyname = 'Users can update their own drafts'
    ) THEN
      CREATE POLICY "Users can update their own drafts"
        ON planner_drafts
        FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'planner_drafts'
        AND policyname = 'Users can delete their own drafts'
    ) THEN
      CREATE POLICY "Users can delete their own drafts"
        ON planner_drafts
        FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
  END IF;
END;
$$;

-- Analytics policies (guarded create).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'planner_analytics') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'planner_analytics'
        AND policyname = 'Users can view own planner analytics'
    ) THEN
      CREATE POLICY "Users can view own planner analytics"
        ON planner_analytics
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'planner_analytics'
        AND policyname = 'Users can insert own planner analytics'
    ) THEN
      CREATE POLICY "Users can insert own planner analytics"
        ON planner_analytics
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;
END;
$$;

-- Index guards (in case environments were partially migrated).
CREATE INDEX IF NOT EXISTS idx_planner_drafts_user_id ON planner_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_drafts_updated_at ON planner_drafts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_planner_exports_share_token ON planner_exports(share_token);
CREATE INDEX IF NOT EXISTS idx_planner_exports_expires_at ON planner_exports(expires_at);
CREATE INDEX IF NOT EXISTS idx_planner_analytics_user_id ON planner_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_analytics_event_name ON planner_analytics(event_name);
CREATE INDEX IF NOT EXISTS idx_planner_analytics_created_at ON planner_analytics(created_at DESC);
