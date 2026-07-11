import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import yaml from 'yaml';

import { buildArtistDisplayData } from '../src/lib/homeData.mjs';

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

async function readFrontmatter(path) {
  const content = await readSource(path);
  const match = content.match(/---\r?\n([\s\S]*?)\r?\n---/);
  return yaml.parse(match[1]);
}

test('artist schema supports optional wiki-oriented metadata fields', async () => {
  const config = await readSource('../src/content.config.ts');

  assert.match(config, /debutDate: z\.string\(\)\.optional\(\)/);
  assert.match(config, /profileTagline: z\.string\(\)\.optional\(\)/);
  assert.match(config, /designCredits: z\.array\(z\.string\(\)\)\.optional\(\)/);
  assert.match(config, /affiliations: z\.array\(z\.string\(\)\)\.optional\(\)/);
  assert.match(config, /officialLinks:/);
  assert.match(config, /featuredEntries:/);
  assert.match(config, /z\.enum\(\['artist', 'project', 'album', 'song'\]\)/);
  assert.match(config, /const theme = z/);
  assert.match(config, /\btheme,\r?\n/);
  assert.match(config, /palette: z\.array/);
});

test('artist infobox and header render optional structured fields', async () => {
  const infoBox = await readSource('../src/components/WikiInfoBox.astro');
  const header = await readSource('../src/components/WikiArticleHeader.astro');
  const artistPage = await readSource('../src/pages/[locale]/artists/[...id].astro');

  assert.match(infoBox, /data\.profileTagline/);
  assert.match(infoBox, /data\.debutDate/);
  assert.match(infoBox, /data\.designCredits/);
  assert.match(infoBox, /data\.affiliations/);
  assert.match(infoBox, /data\.officialLinks/);
  assert.match(infoBox, /data\.featuredEntries/);
  assert.match(infoBox, /data\.theme/);
  assert.match(infoBox, /labels\.theme/);
  assert.match(infoBox, /labels\.kindLabels/);
  assert.match(header, /data\.profileTagline/);
  assert.match(artistPage, /officialLinks/);
  assert.match(artistPage, /featuredEntries/);
  assert.match(artistPage, /wiki-theme-shell/);
  assert.match(artistPage, /accentColor/);
});

test('artist display data preserves extended metadata from content files', async () => {
  const frontmatter = await readFrontmatter('../src/content/artists/vwp/kaf/zh.md');
  const data = buildArtistDisplayData({
    id: 'vwp/kaf/zh',
    data: frontmatter,
  });

  assert.equal(data.debutDate, '2018-10-18');
  assert.equal(data.profileTagline.length > 0, true);
  assert.equal(data.designCredits.length > 0, true);
  assert.equal(data.affiliations.includes('V.W.P'), true);
  assert.equal(data.officialLinks.length > 0, true);
  assert.equal(data.theme.accentColor.startsWith('#'), true);
  assert.equal(data.theme.palette.length > 1, true);
});

test('table of contents tracks the active heading from scroll position', async () => {
  const toc = await readSource('../src/components/TableOfContents.astro');

  assert.match(toc, /requestAnimationFrame/);
  assert.match(toc, /getBoundingClientRect\(\)\.top/);
  assert.match(toc, /window\.addEventListener\('scroll'/);
  assert.match(toc, /setActiveSlug/);
  assert.doesNotMatch(toc, /IntersectionObserver/);
});

test('table of contents controls anchor jumps with the same offset used for tracking', async () => {
  const toc = await readSource('../src/components/TableOfContents.astro');

  assert.match(toc, /event\.preventDefault\(\)/);
  assert.match(toc, /window\.scrollTo/);
  assert.match(toc, /history\.pushState/);
  assert.match(toc, /getAnchorOffset/);
});
