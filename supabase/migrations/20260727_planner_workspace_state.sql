-- Persist generated planner workspace state with autosaved drafts.
ALTER TABLE IF EXISTS planner_drafts
  ADD COLUMN IF NOT EXISTS workspace_state JSONB;

CREATE INDEX IF NOT EXISTS idx_planner_drafts_workspace_state_gin
  ON planner_drafts USING GIN (workspace_state);
