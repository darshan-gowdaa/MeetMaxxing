ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{"email": true, "reminders": true, "in_app": true}'::jsonb;
