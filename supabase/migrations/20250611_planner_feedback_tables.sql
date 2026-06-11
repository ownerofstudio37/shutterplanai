-- Planner Location Feedback table
CREATE TABLE IF NOT EXISTS planner_location_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  location_name TEXT NOT NULL,
  venue_bucket TEXT,
  vote TEXT NOT NULL CHECK (vote IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plan_id, location_name)
);

CREATE INDEX IF NOT EXISTS idx_planner_location_feedback_user_id ON planner_location_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_location_feedback_plan_id ON planner_location_feedback(plan_id);
CREATE INDEX IF NOT EXISTS idx_planner_location_feedback_created_at ON planner_location_feedback(created_at DESC);

-- Planner Applications table (tracks when plans are applied to projects)
CREATE TABLE IF NOT EXISTS planner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  session_category TEXT,
  city TEXT,
  duration TEXT,
  shoot_type TEXT,
  location_vote_count INT DEFAULT 0,
  excluded_bucket_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_planner_applications_user_id ON planner_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_applications_created_at ON planner_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_planner_applications_category ON planner_applications(session_category);

-- Enable RLS if needed
ALTER TABLE planner_location_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for planner_location_feedback
CREATE POLICY "Users can view their own location feedback"
  ON planner_location_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own location feedback"
  ON planner_location_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location feedback"
  ON planner_location_feedback
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for planner_applications
CREATE POLICY "Users can view their own applications"
  ON planner_applications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own applications"
  ON planner_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
