import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../workers/ai-observer/src/index.js';

function createFakeDb() {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const call = { sql, binds: [] };
      calls.push(call);
      return {
        bind(...values) {
          call.binds = values;
          return this;
        },
        async first() {
          return null;
        },
        async run() {
          return { success: true };
        },
        async all() {
          return { results: [] };
        },
      };
    },
  };
}

function createEnv(overrides = {}) {
  return {
    AI_OBSERVER_DB: createFakeDb(),
    IP_HASH_SECRET: 'test-ip-secret',
    SESSION_HASH_SECRET: 'test-session-secret',
    TURNSTILE_SECRET: 'turnstile-secret',
    TURNSTILE_SITE_KEY: 'site-key',
    AI_OBSERVER_RETRIEVAL: 'off',
    ...overrides,
  };
}

test('bootstrap returns greeting, viewer, and Turnstile config', async () => {
  const env = createEnv();
  const request = new Request('https://example.com/api/ai/bootstrap', {
    headers: {
      'CF-Connecting-IP': '203.0.113.42',
      'User-Agent': 'node-test',
    },
  });
  Object.defineProperty(request, 'cf', {
    value: { country: 'CN', region: 'Guangdong', regionCode: 'GD' },
  });

  const response = await worker.fetch(request, env, {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.greeting, '来自广东的观测者，欢迎回来。');
  assert.equal(body.turnstile.siteKey, 'site-key');
  assert.equal(body.viewer.kind, 'anonymous');
  assert.match(response.headers.get('Set-Cookie'), /kfw_ai_session=/);
  assert.equal(env.AI_OBSERVER_DB.calls.length, 1);
  assert.match(env.AI_OBSERVER_DB.calls[0].sql, /INSERT INTO anonymous_sessions/);
  assert.match(env.AI_OBSERVER_DB.calls[0].binds[0], /^anon_/);
  assert.notEqual(env.AI_OBSERVER_DB.calls[0].binds[2], '203.0.113.42');
});

test('chat persists a new anonymous session and returns a normalized event stream', async () => {
  const env = createEnv();
  const response = await worker.fetch(
    new Request('https://example.com/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '203.0.113.42',
      },
      body: JSON.stringify({ message: '神椿是什么？', locale: 'zh' }),
    }),
    env,
    {},
  );

  const text = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'text/event-stream; charset=utf-8');
  assert.match(response.headers.get('Set-Cookie'), /kfw_ai_session=/);
  assert.match(text, /event: delta/);
  assert.match(text, /event: done/);
  assert.equal(env.AI_OBSERVER_DB.calls.length, 2);
  assert.match(env.AI_OBSERVER_DB.calls[0].sql, /INSERT INTO anonymous_sessions/);
  assert.match(env.AI_OBSERVER_DB.calls[1].sql, /INSERT INTO usage_events/);
  assert.equal(env.AI_OBSERVER_DB.calls[1].binds[3], 'mock_chat');
  assert.equal(env.AI_OBSERVER_DB.calls[1].binds[4], 'mock');
  assert.equal(env.AI_OBSERVER_DB.calls[1].binds[5], 'observer-mock-v1');
});

test('chat reuses an existing anonymous session cookie', async () => {
  const env = createEnv();
  const response = await worker.fetch(
    new Request('https://example.com/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'kfw_ai_session=existing-token',
      },
      body: JSON.stringify({ message: '神椿是什么？', locale: 'zh' }),
    }),
    env,
    {},
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.equal(env.AI_OBSERVER_DB.calls.length, 2);
});

test('chat returns challenge_required for high-frequency anonymous messages', async () => {
  const response = await worker.fetch(
    new Request('https://example.com/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Observer-Recent-Count': '8',
      },
      body: JSON.stringify({ message: '神椿是什么？', locale: 'zh' }),
    }),
    createEnv(),
    {},
  );
  const text = await response.text();

  assert.equal(response.status, 429);
  assert.match(text, /event: challenge_required/);
});

test('unknown API routes return 404 JSON', async () => {
  const response = await worker.fetch(new Request('https://example.com/api/missing'), createEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, 'not_found');
});
