import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('layout does not depend on Tailwind CDN at runtime', async () => {
  const layout = await readFile(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');

  assert.equal(layout.includes('cdn.tailwindcss.com'), false);
  assert.equal(layout.includes('tailwind.config'), false);
});

test('Tailwind scans application templates without traversing the content archive', async () => {
  const stylesheet = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');

  assert.match(stylesheet, /@import\s+["']tailwindcss["']\s+source\(none\)/);
  for (const source of ['components', 'layouts', 'lib', 'pages', 'scripts']) {
    assert.match(stylesheet, new RegExp(`@source\\s+["']\\.\\.\\/${source}["']`));
  }
  assert.doesNotMatch(stylesheet, /@source\s+["']\.\.\/content/);
});
