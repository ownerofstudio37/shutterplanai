-- Planner export access controls (idempotent)
-- Adds ownership + optional password protection + revocation support.

ALTER TABLE IF EXISTS planner_exports
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS password_salt TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_planner_exports_user_id ON planner_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_exports_revoked_at ON planner_exports(revoked_at DESC);

-- Cleanup now removes both expired and explicitly revoked shares.
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS void AS $$
BEGIN
  DELETE FROM planner_exports
  WHERE expires_at < NOW()
     OR revoked_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
