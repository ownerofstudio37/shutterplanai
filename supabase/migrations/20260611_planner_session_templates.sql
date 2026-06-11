-- Planner session templates (V2 foundation, idempotent)
-- Enables users to save reusable planning presets.

CREATE TABLE IF NOT EXISTS session_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT session_templates_name_length CHECK (char_length(trim(name)) BETWEEN 1 AND 120)
);

CREATE INDEX IF NOT EXISTS idx_session_templates_user_id ON session_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_session_templates_updated_at ON session_templates(updated_at DESC);

ALTER TABLE session_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_templates'
      AND policyname = 'Users can view own session templates'
  ) THEN
    CREATE POLICY "Users can view own session templates"
      ON session_templates
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_templates'
      AND policyname = 'Users can create own session templates'
  ) THEN
    CREATE POLICY "Users can create own session templates"
      ON session_templates
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_templates'
      AND policyname = 'Users can update own session templates'
  ) THEN
    CREATE POLICY "Users can update own session templates"
      ON session_templates
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_templates'
      AND policyname = 'Users can delete own session templates'
  ) THEN
    CREATE POLICY "Users can delete own session templates"
      ON session_templates
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END;
$$;
