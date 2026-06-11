-- Planner analytics events
CREATE TABLE IF NOT EXISTS planner_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planner_analytics_user_id ON planner_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_analytics_event_name ON planner_analytics(event_name);
CREATE INDEX IF NOT EXISTS idx_planner_analytics_created_at ON planner_analytics(created_at DESC);

ALTER TABLE planner_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own planner analytics"
  ON planner_analytics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planner analytics"
  ON planner_analytics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
