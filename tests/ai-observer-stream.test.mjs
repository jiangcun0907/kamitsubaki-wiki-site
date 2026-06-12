import assert from 'node:assert/strict';
import test from 'node:test';

import { parseAiStreamChunk } from '../src/lib/aiStream.mjs';
import { createMockObserverStream } from '../workers/ai-observer/src/mockProvider.js';
import { createEncodedStream, encodeStreamEvent, streamResponse } from '../workers/ai-observer/src/stream.js';

async function readStreamText(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return text;
    }
    text += decoder.decode(value, { stream: true });
  }
}

async function readDeltaText(stream) {
  const streamText = await readStreamText(stream);
  const { events } = parseAiStreamChunk(streamText);

  return events
    .filter((event) => event.type === 'delta')
    .map((event) => event.data.text)
    .join('');
}

test('encodeStreamEvent emits normalized SSE frames', () => {
  assert.equal(
    encodeStreamEvent('status', { label: '检索站内档案' }),
    'event: status\ndata: {"label":"检索站内档案"}\n\n',
  );
});

test('parseAiStreamChunk parses complete normalized events', () => {
  const result = parseAiStreamChunk('event: delta\ndata: {"text":"花譜"}\n\n');

  assert.deepEqual(result.events, [{ type: 'delta', data: { text: '花譜' } }]);
  assert.equal(result.remainder, '');
});

test('parseAiStreamChunk parses CRLF-delimited frames', () => {
  const result = parseAiStreamChunk('event: delta\r\ndata: {"text":"理芽"}\r\n\r\n');

  assert.deepEqual(result.events, [{ type: 'delta', data: { text: '理芽' } }]);
  assert.equal(result.remainder, '');
});

test('parseAiStreamChunk preserves a CRLF-delimited frame split after CR', () => {
  const first = parseAiStreamChunk('event: delta\r');
  const second = parseAiStreamChunk('\ndata: {"text":"x"}\r\n\r\n', first.remainder);

  assert.deepEqual(first.events, []);
  assert.equal(first.remainder, 'event: delta\r');
  assert.deepEqual(second.events, [{ type: 'delta', data: { text: 'x' } }]);
  assert.equal(second.remainder, '');
});

test('parseAiStreamChunk parses CR-delimited frames', () => {
  const result = parseAiStreamChunk('event: delta\rdata: {"text":"観測"}\r\r');

  assert.deepEqual(result.events, [{ type: 'delta', data: { text: '観測' } }]);
  assert.equal(result.remainder, '');
});

test('parseAiStreamChunk parses no-space SSE field syntax', () => {
  const result = parseAiStreamChunk('event:delta\nretry:1000\ndata:{"text":"春猿火"}\n\n');

  assert.deepEqual(result.events, [{ type: 'delta', data: { text: '春猿火' } }]);
  assert.equal(result.remainder, '');
});

test('parseAiStreamChunk preserves incomplete frames as remainder', () => {
  const result = parseAiStreamChunk('event: delta\ndata: {"text"');

  assert.deepEqual(result.events, []);
  assert.equal(result.remainder, 'event: delta\ndata: {"text"');
});

test('parseAiStreamChunk completes a frame with previous remainder', () => {
  const first = parseAiStreamChunk('event: delta\ndata: {"text"');
  const second = parseAiStreamChunk(':"ヰ世界情緒"}\n\n', first.remainder);

  assert.deepEqual(first.events, []);
  assert.equal(first.remainder, 'event: delta\ndata: {"text"');
  assert.deepEqual(second.events, [{ type: 'delta', data: { text: 'ヰ世界情緒' } }]);
  assert.equal(second.remainder, '');
});

test('parseAiStreamChunk joins multiple data lines before parsing JSON', () => {
  const result = parseAiStreamChunk('event: delta\ndata: {"text":\ndata: "幸祜"}\n\n');

  assert.deepEqual(result.events, [{ type: 'delta', data: { text: '幸祜' } }]);
  assert.equal(result.remainder, '');
});

test('parseAiStreamChunk returns an error event for invalid JSON frames', () => {
  const result = parseAiStreamChunk('event: delta\ndata: {"text"\n\n');

  assert.deepEqual(result.events, [{ type: 'error', data: { code: 'invalid_stream_event' } }]);
  assert.equal(result.remainder, '');
});

test('createEncodedStream emits an error event and closes when the writer throws', async () => {
  const streamText = await readStreamText(createEncodedStream(() => {
    throw new Error('writer failed');
  }));

  assert.match(streamText, /event: error/);
  assert.match(streamText, /stream_error/);
});

test('streamResponse returns normalized SSE response headers', () => {
  const response = streamResponse(new ReadableStream());

  assert.equal(response.headers.get('Content-Type'), 'text/event-stream; charset=utf-8');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Accel-Buffering'), 'no');
});

test('createMockObserverStream returns status, source, delta, and done events', async () => {
  const streamText = await readStreamText(createMockObserverStream({ message: '神椿是什么？', locale: 'zh' }));

  assert.match(streamText, /event: status/);
  assert.match(streamText, /event: source/);
  assert.match(streamText, /event: delta/);
  assert.match(streamText, /event: done/);
  assert.match(streamText, /KAMITSUBAKI STUDIO/);
});

test('createMockObserverStream emits retrieved source metadata in answers', async () => {
  const source = {
    title: 'Wikipedia: 神椿工作室',
    url: 'https://zh.wikipedia.org/wiki/%E7%A5%9E%E6%A4%BF%E5%B7%A5%E4%BD%9C%E5%AE%A4',
    sourceType: 'wiki',
    trustTier: 'medium',
  };
  const streamText = await readStreamText(
    createMockObserverStream({ message: '神椿是什么？', locale: 'zh', sources: [source] }),
  );
  const { events } = parseAiStreamChunk(streamText);
  const emittedSource = events.find((event) => event.type === 'source');
  const answer = events
    .filter((event) => event.type === 'delta')
    .map((event) => event.data.text)
    .join('');

  assert.deepEqual(emittedSource.data, source);
  assert.match(answer, /Wikipedia: 神椿工作室/);
});

test('createMockObserverStream returns a Japanese answer for ja locale', async () => {
  const answer = await readDeltaText(createMockObserverStream({ message: '神椿とは？', locale: 'ja' }));

  assert.match(answer, /音楽・物語・バーチャル表現/);
});

test('createMockObserverStream returns an English answer for en locale', async () => {
  const answer = await readDeltaText(createMockObserverStream({ message: 'What is Kamitsubaki?', locale: 'en' }));

  assert.match(answer, /creative label crossing music, story worlds, and virtual performance/);
});
