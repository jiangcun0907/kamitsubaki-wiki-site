import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL('../workers/ai-observer/migrations/0001_ai_observer_assistant.sql', import.meta.url);

test('AI observer migration defines the core production tables', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  const tableNames = [
    'users',
    'user_identities',
    'anonymous_sessions',
    'chat_threads',
    'chat_messages',
    'chat_sources',
    'search_events',
    'usage_events',
    'abuse_events',
    'deletion_requests',
  ];

  for (const tableName of tableNames) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}\\b`));
  }
});

test('AI observer migration stores hashed IPs but no plaintext IP column', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /\bip_hash TEXT\b/);
  assert.doesNotMatch(sql, /\bip TEXT\b/);
  assert.doesNotMatch(sql, /\bplain_ip\b/);
});

test('AI observer migration adds ownership and lookup indexes', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(
    sql,
    /\bCREATE UNIQUE INDEX IF NOT EXISTS idx_user_identities_provider_user\s+ON user_identities\(provider, provider_user_id\);/,
  );

  const requiredIndexes = [
    'idx_anonymous_sessions_token_ip',
    'idx_chat_threads_user_updated',
    'idx_chat_threads_anonymous_updated',
    'idx_chat_messages_thread_created',
    'idx_abuse_events_ip_created',
  ];

  for (const indexName of requiredIndexes) {
    assert.match(sql, new RegExp(`CREATE INDEX IF NOT EXISTS ${indexName}\\b`));
  }
});

test('AI observer migration enforces unique anonymous session token ownership', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(
    sql,
    /\bCREATE UNIQUE INDEX IF NOT EXISTS idx_anonymous_sessions_token_hash\s+ON anonymous_sessions\(session_token_hash\);/,
  );
});

test('AI observer migration requires deletion requests to target exactly one owner', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(
    sql,
    /CREATE TABLE IF NOT EXISTS deletion_requests \([\s\S]*CHECK \(\s*\(user_id IS NOT NULL AND anonymous_session_id IS NULL\)\s*OR \(user_id IS NULL AND anonymous_session_id IS NOT NULL\)\s*\)\s*\);/,
  );
});
