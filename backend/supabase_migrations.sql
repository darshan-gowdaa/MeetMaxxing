-- MeetMaxxing Supabase Database Schema
-- Run these in order in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  calendar_token JSONB,  -- Google OAuth tokens
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Meetings ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Meeting',
  attendees TEXT[],             -- email addresses
  start_at TIMESTAMPTZ DEFAULT NOW(),
  end_at TIMESTAMPTZ,
  google_meet_link TEXT,
  status TEXT DEFAULT 'active', -- active | completed | no_transcript
  -- Post-processing outputs
  transcript_data JSONB,        -- array of {speaker, text, timestamp_ms}
  summary TEXT,
  decisions JSONB,              -- array of {text, decided_by, confidence}
  action_items JSONB,           -- array of {text, owner, due_date, priority}
  follow_up JSONB,              -- {required, suggested_topic, suggested_attendees}
  -- Post-meeting agent results
  scheduling_result JSONB,
  email_result JSONB,

  -- Metadata
  calendar_event_id TEXT,       -- Google Calendar event ID for follow-up
  guardrail_score FLOAT,        -- Lyzr evaluation score
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meetings_org_id ON meetings(org_id);
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_start_at ON meetings(start_at DESC);
CREATE INDEX idx_meetings_status ON meetings(status);

-- ─── Action Items ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  owner_id UUID REFERENCES users(id),
  owner_name TEXT DEFAULT 'Unassigned',
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',   -- open | in_progress | done
  priority TEXT DEFAULT 'medium', -- high | medium | low
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_action_items_meeting ON action_items(meeting_id);
CREATE INDEX idx_action_items_org ON action_items(org_id);
CREATE INDEX idx_action_items_status ON action_items(status);

-- ─── Reminders ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  calendar_event_id TEXT,
  remind_before_minutes INTEGER DEFAULT 10,
  channel TEXT DEFAULT 'popup',  -- popup | email
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ─────────────────────────────────────────────────────────
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see their org's data
CREATE POLICY "org_isolation_meetings" ON meetings
  FOR ALL USING (org_id = (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "org_isolation_action_items" ON action_items
  FOR ALL USING (org_id = (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "own_user_record" ON users
  FOR ALL USING (id = auth.uid());

-- ─── Updated_at trigger ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER action_items_updated_at BEFORE UPDATE ON action_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── API Keys ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  label TEXT,
  key_ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  wrapped_dek TEXT NOT NULL,
  kms_key_id TEXT,
  last4 TEXT NOT NULL,
  status TEXT DEFAULT 'unchecked',
  last_checked_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_message_safe TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_default_for_provider BOOLEAN DEFAULT false,
  UNIQUE(user_id, provider_id, label)
);

CREATE INDEX idx_user_api_keys_user ON user_api_keys(user_id);
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_api_keys" ON user_api_keys FOR ALL USING (user_id = auth.uid());
CREATE TRIGGER api_keys_updated_at BEFORE UPDATE ON user_api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Model Preferences ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_model_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  feature_scope TEXT DEFAULT 'default_chat',
  mode TEXT DEFAULT 'manual', -- manual | smart
  provider_credential_id UUID REFERENCES user_api_keys(id) ON DELETE SET NULL,
  model_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_scope)
);

CREATE INDEX idx_model_prefs_user ON user_model_preferences(user_id);
ALTER TABLE user_model_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_model_prefs" ON user_model_preferences FOR ALL USING (user_id = auth.uid());
CREATE TRIGGER model_prefs_updated_at BEFORE UPDATE ON user_model_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

