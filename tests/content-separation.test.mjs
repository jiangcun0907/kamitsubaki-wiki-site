import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

async function fileExists(path) {
  try {
    await access(new URL(path, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

test('site content lives in Astro content collections', async () => {
  assert.equal(await fileExists('../src/content.config.ts'), true);
  assert.equal(await fileExists('../src/content/site/zh.json'), true);
  assert.equal(await fileExists('../src/content/artists/kaf.zh.json'), true);
  assert.equal(await fileExists('../src/content/projects/kamitsubaki-city.zh.json'), true);
  assert.equal(await fileExists('../src/content/logs/2024-06-01-vwp-live.zh.json'), true);
});

test('home page no longer imports the old implementation-side data module', async () => {
  const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');

  assert.equal(page.includes('../data/siteData.mjs'), false);
  assert.equal(await fileExists('../src/data/siteData.mjs'), false);
});
