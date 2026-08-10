CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── API Keys ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id);
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_api_keys" ON user_api_keys;
CREATE POLICY "own_api_keys" ON user_api_keys FOR ALL USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS api_keys_updated_at ON user_api_keys;
CREATE TRIGGER api_keys_updated_at BEFORE UPDATE ON user_api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Model Preferences ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_model_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  feature_scope TEXT DEFAULT 'default_chat',
  mode TEXT DEFAULT 'manual', -- manual | smart
  provider_credential_id UUID REFERENCES user_api_keys(id) ON DELETE SET NULL,
  model_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_scope)
);

CREATE INDEX IF NOT EXISTS idx_model_prefs_user ON user_model_preferences(user_id);
ALTER TABLE user_model_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_model_prefs" ON user_model_preferences;
CREATE POLICY "own_model_prefs" ON user_model_preferences FOR ALL USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS model_prefs_updated_at ON user_model_preferences;
CREATE TRIGGER model_prefs_updated_at BEFORE UPDATE ON user_model_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
