import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildArticleMetadata, scanMarkdownDescription } from '../src/lib/metadata.mjs';

test('article metadata prefers custom seo fields over scanned fallbacks', () => {
  const metadata = buildArticleMetadata({
    locale: 'zh',
    id: 'vwp/kaf',
    body: '自动摘要不应该覆盖自定义描述。',
    data: {
      name: '花谱',
      romanizedName: 'KAF',
      categoryTitle: '虚拟世代的魔女们',
      categorySubtitle: 'VIRTUAL WITCH PHENOMENON',
      status: 'ACTIVE',
      image: 'https://example.com/default.jpg',
      seo: {
        title: '自定义标题',
        description: '自定义 SEO 描述',
        image: 'https://example.com/seo.jpg',
        keywords: ['KAF', '花谱'],
      },
    },
  });

  assert.equal(metadata.title, '自定义标题');
  assert.equal(metadata.description, '自定义 SEO 描述');
  assert.equal(metadata.image, 'https://example.com/seo.jpg');
  assert.equal(metadata.canonicalPath, '/zh/artists/vwp/kaf');
  assert.deepEqual(metadata.keywords, ['KAF', '花谱']);
});

test('article metadata scans markdown when seo description is not provided', () => {
  const body = `
# 标题会被跳过

这是第一段正文，包含 [链接](https://example.com) 和 **强调**，应该被整理成干净摘要。

这是第二段。
`;

  const metadata = buildArticleMetadata({
    locale: 'zh',
    id: 'vwp/kaf',
    body,
    data: {
      name: '花谱',
      romanizedName: 'KAF',
      categoryTitle: '虚拟世代的魔女们',
      categorySubtitle: 'VIRTUAL WITCH PHENOMENON',
      status: 'ACTIVE',
      image: 'https://example.com/default.jpg',
    },
  });

  assert.equal(metadata.description, '这是第一段正文，包含链接和强调，应该被整理成干净摘要。');
  assert.equal(scanMarkdownDescription(''), 'KAMITSUBAKI STUDIO 非官方粉丝百科。');
});

test('article metadata supports title-based works and noindexes stub entries', () => {
  const metadata = buildArticleMetadata({
    locale: 'en',
    id: 'vwp/fate',
    collection: 'albums',
    data: {
      title: 'FATE',
      artist: 'V.W.P',
      description: 'V.W.P first album',
      contentStatus: 'stub',
    },
  });

  assert.equal(metadata.title, 'FATE - Kamitsubaki Studio Fan Wiki');
  assert.equal(metadata.description, 'FATE / V.W.P first album');
  assert.equal(metadata.noindex, true);
});

test('base layout renders configurable metadata tags', async () => {
  const layout = await readFile(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');

  assert.match(layout, /name="description"/);
  assert.match(layout, /rel="canonical"/);
  assert.match(layout, /property="og:title"/);
  assert.match(layout, /name="twitter:card"/);
  assert.match(layout, /name="robots"/);
  assert.match(layout, /PUBLIC_SITE_URL/);
});
