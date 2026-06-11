-- Planner Exports for shareable plans
CREATE TABLE IF NOT EXISTS planner_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token TEXT NOT NULL UNIQUE,
  plan_data JSONB NOT NULL,
  metadata JSONB,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planner_exports_share_token ON planner_exports(share_token);
CREATE INDEX IF NOT EXISTS idx_planner_exports_expires_at ON planner_exports(expires_at);

-- Lock down direct client access; API routes use service role key.
ALTER TABLE planner_exports ENABLE ROW LEVEL SECURITY;

-- Cleanup expired exports
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS void AS $$
BEGIN
  DELETE FROM planner_exports WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
