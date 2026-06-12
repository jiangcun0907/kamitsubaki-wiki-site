import { assessChatRequest } from './abuse.js';
import { buildObserverGreeting } from './geo.js';
import { createSessionToken, hashIpAddress, hashSessionToken, hmacSha256Hex } from './identity.js';
import { createMockObserverStream } from './mockProvider.js';
import { retrieveKamitsubakiSources } from './retrieval.js';
import { recordUsageEvent, upsertAnonymousSession } from './storage.js';
import { createEncodedStream, streamResponse } from './stream.js';

const SESSION_COOKIE = 'kfw_ai_session';

function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...(init.headers ?? {}),
    },
  });
}

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') ?? '';
  const matched = cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  return matched ? decodeURIComponent(matched.slice(name.length + 1)) : '';
}

function getRequestIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}

function createCookie(value) {
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`;
}

function withSessionCookie(response, session) {
  if (!session.isNew) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set('Set-Cookie', createCookie(session.sessionToken));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function buildAnonymousSession(request, env) {
  const existingToken = getCookie(request, SESSION_COOKIE);
  const sessionToken = existingToken || createSessionToken();
  const sessionTokenHash = await hashSessionToken(sessionToken, env.SESSION_HASH_SECRET);
  const ipHash = await hashIpAddress(getRequestIp(request), env.IP_HASH_SECRET);
  const uaHash = await hmacSha256Hex(request.headers.get('User-Agent') ?? 'unknown', env.SESSION_HASH_SECRET);

  return {
    id: `anon_${sessionTokenHash.slice(0, 24)}`,
    sessionToken,
    isNew: !existingToken,
    sessionTokenHash,
    ipHash,
    uaHash,
    country: request.cf?.country ?? null,
    region: request.cf?.region ?? null,
    regionCode: request.cf?.regionCode ?? null,
  };
}

async function handleBootstrap(request, env) {
  const session = await buildAnonymousSession(request, env);
  await upsertAnonymousSession(env.AI_OBSERVER_DB, session);

  const headers = {};
  if (session.isNew) {
    headers['Set-Cookie'] = createCookie(session.sessionToken);
  }

  return json(
    {
      viewer: {
        kind: 'anonymous',
        sessionId: session.id,
      },
      greeting: buildObserverGreeting({ cf: request.cf ?? {} }),
      turnstile: {
        siteKey: env.TURNSTILE_SITE_KEY ?? '',
      },
      limits: {
        messageMaxLength: 5000,
      },
      recentThreads: [],
      featureFlags: {
        mockProvider: true,
      },
    },
    { headers },
  );
}

async function parseChatBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function challengeRequiredResponse(assessment) {
  const response = streamResponse(
    createEncodedStream((emit) => {
      emit('challenge_required', {
        reason: assessment.reason,
        message: '观测频率过高，先确认一下信标。',
      });
    }),
  );

  return new Response(response.body, { status: 429, headers: response.headers });
}

function chatErrorResponse(assessment) {
  return streamResponse(
    createEncodedStream((emit) => {
      emit('error', {
        code: assessment.reason,
        message:
          assessment.reason === 'message_too_long' ? '这段观测记录太长了，先缩短一点再发送。' : '请输入想观测的问题。',
      });
    }),
  );
}

async function handleChat(request, env) {
  const body = await parseChatBody(request);
  const message = typeof body.message === 'string' ? body.message : '';
  const locale = typeof body.locale === 'string' ? body.locale : 'zh';
  const recentRequestCount = Number(request.headers.get('X-AI-Observer-Recent-Count') ?? '0');
  const assessment = assessChatRequest({ message, recentRequestCount, isLoggedIn: false });

  if (assessment.requiresTurnstile) {
    return challengeRequiredResponse(assessment);
  }

  if (!assessment.allowed) {
    return chatErrorResponse(assessment);
  }

  const session = await buildAnonymousSession(request, env);
  await upsertAnonymousSession(env.AI_OBSERVER_DB, session);
  await recordUsageEvent(env.AI_OBSERVER_DB, {
    id: crypto.randomUUID(),
    anonymousSessionId: session.id,
    ipHash: session.ipHash,
    eventType: 'mock_chat',
    modelProvider: 'mock',
    modelName: 'observer-mock-v1',
  });

  const sources =
    env.AI_OBSERVER_RETRIEVAL === 'off'
      ? undefined
      : await retrieveKamitsubakiSources({
          message,
          locale,
          fetchImpl: fetch,
          limit: 6,
        });

  return withSessionCookie(streamResponse(createMockObserverStream({ message, locale, sources })), session);
}

function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type, X-AI-Observer-Recent-Count',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    if (url.pathname === '/api/ai/bootstrap' && request.method === 'GET') {
      return handleBootstrap(request, env, ctx);
    }

    if (url.pathname === '/api/ai/chat' && request.method === 'POST') {
      return handleChat(request, env, ctx);
    }

    return json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 });
  },
};
