import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('media switcher ships accessible pointer and keyboard interactions', async () => {
  const layout = await readSource('../src/layouts/BaseLayout.astro');
  const script = await readSource('../src/scripts/mediaSwitcher.js');
  const styles = await readSource('../src/styles/mediaSwitcher.css');

  assert.match(layout, /mediaSwitcher\.css/);
  assert.match(layout, /mediaSwitcher\.js/);
  assert.match(script, /aria-selected/);
  assert.match(script, /aria-controls/);
  assert.match(script, /ArrowLeft/);
  assert.match(script, /ArrowRight/);
  assert.match(script, /Home/);
  assert.match(script, /End/);
  assert.match(script, /panel\.hidden = !active/);
  assert.match(styles, /\[aria-selected='true'\]/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /max-width: 640px/);
  assert.match(styles, /wiki-embed--apple-music/);
  assert.match(styles, /wiki-embed--netease/);
  assert.match(styles, /width: min\(100%, 42rem\)/);
  assert.match(styles, /wiki-embed__caption[\s\S]*display: none/);
});

test('media switcher authoring rules are documented in every locale', async () => {
  for (const locale of ['zh', 'ja', 'en']) {
    const guide = await readSource(`../src/content/contribute/syntax-guide/${locale}.md`);
    assert.match(guide, /\{\{media-switcher::/);
    assert.match(guide, /\{\{\/media-switcher\}\}/);
    assert.match(guide, /2[–-]6/);
    assert.match(guide, /@\[bilibili\]/);
    assert.match(guide, /@\[youtube\]/);
  }
});
