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
  slack_result JSONB,
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
