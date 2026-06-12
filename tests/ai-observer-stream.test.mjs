import assert from 'node:assert/strict';
import test from 'node:test';

import { parseAiStreamChunk } from '../src/lib/aiStream.mjs';
import { createMockObserverStream } from '../workers/ai-observer/src/mockProvider.js';
import { encodeStreamEvent } from '../workers/ai-observer/src/stream.js';

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

test('parseAiStreamChunk preserves incomplete frames as remainder', () => {
  const result = parseAiStreamChunk('event: delta\ndata: {"text"');

  assert.deepEqual(result.events, []);
  assert.equal(result.remainder, 'event: delta\ndata: {"text"');
});

test('createMockObserverStream returns status, source, delta, and done events', async () => {
  const streamText = await readStreamText(createMockObserverStream({ message: '神椿是什么？', locale: 'zh' }));

  assert.match(streamText, /event: status/);
  assert.match(streamText, /event: source/);
  assert.match(streamText, /event: delta/);
  assert.match(streamText, /event: done/);
  assert.match(streamText, /KAMITSUBAKI STUDIO/);
});
