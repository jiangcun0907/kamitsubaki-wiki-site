import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { readContentEntryBody, renderContentEntry } from '../src/lib/contentSource.mjs';
import { withoutRenderedContent } from '../src/lib/metadataOnlyGlob.mjs';

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
  assert.equal(await fileExists('../src/content/artists/vwp/kaf/zh.md'), true);
  assert.equal(await fileExists('../src/content/projects/arg/kamitsubaki-city/zh.md'), true);
  assert.equal(await fileExists('../src/pages/[locale]/projects/[...id].astro'), true);
  assert.equal(await fileExists('../src/content/logs/2024/2024-06-01-vwp-live/zh.md'), true);
  assert.equal(await fileExists('../src/pages/[locale]/logs/[...id].astro'), true);
});

test('rendered Markdown collections do not retain duplicate source bodies', async () => {
  const config = await readFile(new URL('../src/content.config.ts', import.meta.url), 'utf8');
  const collectionNames = [
    'artists',
    'projects',
    'logs',
    'songs',
    'albums',
    'announcements',
    'syntaxGuide',
    'editGuide',
  ];

  for (const [index, name] of collectionNames.entries()) {
    const start = config.indexOf(`const ${name} = defineCollection`);
    const nextStarts = collectionNames
      .slice(index + 1)
      .map((nextName) => config.indexOf(`const ${nextName} = defineCollection`))
      .filter((position) => position > start);
    const end = nextStarts.length ? Math.min(...nextStarts) : config.length;
    assert.notEqual(start, -1, `${name} collection should exist`);
    assert.match(config.slice(start, end), /retainBody: false/, `${name} should discard its source body`);
    assert.match(config.slice(start, end), /metadataOnlyGlob/, `${name} should keep rendered HTML out of the data store`);
  }

  const aiIndex = await readFile(new URL('../src/pages/ai-index.json.ts', import.meta.url), 'utf8');
  assert.match(aiIndex, /await readContentEntryBody\(entry\)/);
  assert.doesNotMatch(aiIndex, /entry\.(?:body|rendered)/);
});

test('metadata-only entries drop large bodies and render from their source file on demand', async () => {
  const compact = withoutRenderedContent({
    id: 'syntax-guide/zh',
    data: { locale: 'zh' },
    filePath: 'src/content/contribute/syntax-guide/zh.md',
    digest: 'test',
    body: 'duplicate Markdown',
    rendered: { html: '<p>duplicate HTML</p>' },
  });

  assert.equal(compact.body, undefined);
  assert.equal(compact.rendered, undefined);

  const entry = {
    id: 'syntax-guide/zh',
    filePath: 'src/content/contribute/syntax-guide/zh.md',
  };
  const { body } = await readContentEntryBody(entry);
  const rendered = await renderContentEntry(entry);

  assert.match(body, /^## 开始之前/m);
  assert.match(rendered.html, /<h2 id="开始之前">开始之前<\/h2>/);
  assert.ok(rendered.headings.some((heading) => heading.text === '开始之前'));
});

test('home page no longer imports the old implementation-side data module', async () => {
  const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');

  assert.equal(page.includes('../data/siteData.mjs'), false);
  assert.equal(await fileExists('../src/data/siteData.mjs'), false);
});
