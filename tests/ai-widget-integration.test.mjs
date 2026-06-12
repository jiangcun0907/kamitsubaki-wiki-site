import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const locales = ['zh', 'ja', 'en'];

async function readProjectFile(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('AI chat copy lives in localized site content', async () => {
  for (const locale of locales) {
    const content = JSON.parse(await readProjectFile(`../src/content/site/${locale}.json`));

    assert.equal(typeof content.aiChat.title, 'string');
    assert.equal(typeof content.aiChat.greeting, 'string');
    assert.equal(typeof content.aiChat.fallbackOffline, 'string');
    assert.equal(typeof content.aiChat.challengeFallback, 'string');
    assert.equal(typeof content.aiChat.streamErrorFallback, 'string');
    assert.equal(content.aiChat.quickPrompts.length >= 1, true);
  }
});

test('AI chat widget receives copy from BaseLayout content lookup', async () => {
  const layout = await readProjectFile('../src/layouts/BaseLayout.astro');

  assert.match(layout, /getCollection\('site'\)/);
  assert.match(layout, /data\.aiChat/);
  assert.match(layout, /<AiChatWidget lang=\{lang\} copy=\{aiChatCopy\}/);
});

test('AI chat implementation does not hardcode localized chat copy', async () => {
  const component = await readProjectFile('../src/components/AiChatWidget.astro');
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');

  assert.equal(component.includes('神椿是什么？'), false);
  assert.equal(component.includes('Need a quick Kamitsubaki primer?'), false);
  assert.equal(script.includes('观测回线暂时不稳定'), false);
  assert.equal(script.includes('观测频率过高'), false);
  assert.equal(script.includes('The observation line is offline'), false);
});

test('AI chat widget exposes interaction hooks and stream parser integration', async () => {
  const component = await readProjectFile('../src/components/AiChatWidget.astro');
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');
  const css = await readProjectFile('../src/styles/global.css');

  assert.match(component, /data-ai-chat/);
  assert.match(component, /data-ai-toggle/);
  assert.match(component, /data-ai-messages/);
  assert.match(component, /data-ai-form/);
  assert.match(script, /parseAiStreamChunk/);
  assert.match(script, /text\/event-stream/);
  assert.match(script, /dataset\.aiPrompt/);
  assert.match(css, /\.ai-chat\.is-thinking/);
  assert.match(css, /@keyframes aiThinking/);
  assert.match(css, /@media \(max-width: 639px\)/);
});
