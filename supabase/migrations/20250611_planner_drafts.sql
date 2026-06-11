-- Planner Drafts table for auto-save
CREATE TABLE IF NOT EXISTS planner_drafts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_state JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('intake', 'review', 'applying')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_planner_drafts_user_id ON planner_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_drafts_updated_at ON planner_drafts(updated_at DESC);

-- Enable RLS
ALTER TABLE planner_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own drafts"
  ON planner_drafts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drafts"
  ON planner_drafts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
  ON planner_drafts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
  ON planner_drafts
  FOR DELETE
  USING (auth.uid() = user_id);
