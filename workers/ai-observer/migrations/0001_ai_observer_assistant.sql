PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  primary_locale TEXT NOT NULL DEFAULT 'zh',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS user_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_username TEXT,
  provider_email_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS anonymous_sessions (
  id TEXT PRIMARY KEY,
  session_token_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  ua_hash TEXT,
  country TEXT,
  region TEXT,
  region_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  merged_user_id TEXT,
  deleted_at TEXT,
  FOREIGN KEY (merged_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  anonymous_session_id TEXT,
  title TEXT NOT NULL DEFAULT 'Observation Thread',
  locale TEXT NOT NULL DEFAULT 'zh',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (anonymous_session_id) REFERENCES anonymous_sessions(id) ON DELETE CASCADE,
  CHECK (
    (user_id IS NOT NULL AND anonymous_session_id IS NULL)
    OR (user_id IS NULL AND anonymous_session_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'complete',
  model_provider TEXT,
  model_name TEXT,
  token_input INTEGER NOT NULL DEFAULT 0,
  token_output INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE,
  CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE TABLE IF NOT EXISTS chat_sources (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  trust_tier TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  snippet TEXT,
  language TEXT,
  rank INTEGER NOT NULL DEFAULT 0,
  retrieved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS search_events (
  id TEXT PRIMARY KEY,
  thread_id TEXT,
  message_id TEXT,
  query TEXT NOT NULL,
  search_scope TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  used_fallback_web INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE SET NULL,
  FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  anonymous_session_id TEXT,
  ip_hash TEXT,
  event_type TEXT NOT NULL,
  model_provider TEXT,
  model_name TEXT,
  token_input INTEGER NOT NULL DEFAULT 0,
  token_output INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (anonymous_session_id) REFERENCES anonymous_sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS abuse_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  anonymous_session_id TEXT,
  ip_hash TEXT,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  reason TEXT NOT NULL,
  turnstile_required INTEGER NOT NULL DEFAULT 0,
  turnstile_passed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (anonymous_session_id) REFERENCES anonymous_sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS deletion_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  anonymous_session_id TEXT,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (anonymous_session_id) REFERENCES anonymous_sessions(id) ON DELETE SET NULL,
  CHECK (
    (user_id IS NOT NULL AND anonymous_session_id IS NULL)
    OR (user_id IS NULL AND anonymous_session_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_identities_provider_user
  ON user_identities(provider, provider_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_anonymous_sessions_token_hash
  ON anonymous_sessions(session_token_hash);

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_token_ip
  ON anonymous_sessions(session_token_hash, ip_hash);

CREATE INDEX IF NOT EXISTS idx_chat_threads_user_updated
  ON chat_threads(user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_chat_threads_anonymous_updated
  ON chat_threads(anonymous_session_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
  ON chat_messages(thread_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_sources_message_rank
  ON chat_sources(message_id, rank);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_created
  ON usage_events(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_usage_events_anonymous_created
  ON usage_events(anonymous_session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_usage_events_ip_created
  ON usage_events(ip_hash, created_at);

CREATE INDEX IF NOT EXISTS idx_abuse_events_ip_created
  ON abuse_events(ip_hash, created_at);
