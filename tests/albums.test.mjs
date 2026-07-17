import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

function readProjectFile(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('albums are registered as a localized content collection with list and detail routes', async () => {
  const [config, listPage, detailPage] = await Promise.all([
    readProjectFile('../src/content.config.ts'),
    readProjectFile('../src/pages/[locale]/albums/index.astro'),
    readProjectFile('../src/pages/[locale]/albums/[...id].astro'),
  ]);

  assert.match(config, /const albums = defineCollection/);
  assert.match(config, /base: '\.\/src\/content\/albums'/);
  assert.match(config, /tracks: z/);
  assert.match(listPage, /getCollection\('albums'\)/);
  assert.match(detailPage, /collection="albums"/);
  assert.match(detailPage, /src\/content\/albums\/\$\{id\}/);
});

test('album home section is rendered after songs and before the maintenance roster', async () => {
  const homePage = await readProjectFile('../src/pages/[locale]/index.astro');
  const songsIndex = homePage.indexOf('<SongsSection');
  const albumsIndex = homePage.indexOf('<AlbumsSection');
  const rosterIndex = homePage.indexOf('<ContributorRoster');

  assert.ok(songsIndex >= 0);
  assert.ok(albumsIndex > songsIndex);
  assert.ok(rosterIndex > albumsIndex);
});

test('album navigation and labels exist in every supported locale', async () => {
  for (const locale of ['zh', 'ja', 'en']) {
    const site = JSON.parse(await readProjectFile(`../src/content/site/${locale}.json`));
    assert.equal(site.navItems.find((item) => item.href === '#albums')?.label, 'ALBUMS');
    assert.equal(typeof site.sections.albums.heading, 'string');
    assert.equal(typeof site.sections.albums.emptyLabel, 'string');
  }
});

test('album and song contributions are included in contributor history', async () => {
  const { parseContentPath } = await import('../scripts/contributor-history.mjs');
  assert.deepEqual(parseContentPath('src/content/albums/kaf/example/zh.md'), {
    collection: 'albums',
    entryId: 'kaf/example',
    locale: 'zh',
  });
  assert.deepEqual(parseContentPath('src/content/songs/kaf/example/ja.md'), {
    collection: 'songs',
    entryId: 'kaf/example',
    locale: 'ja',
  });
});

test('albums are included in the AI index and use entry-specific edit targets', async () => {
  const [aiIndex, roster] = await Promise.all([
    readProjectFile('../src/pages/ai-index.json.ts'),
    readProjectFile('../src/components/ContributorRoster.astro'),
  ]);

  assert.match(aiIndex, /getCollection\('albums'\)/);
  assert.match(aiIndex, /getCollection\('songs'\)/);
  assert.match(roster, /'albums'/);
  assert.match(roster, /src\/content\/\$\{collection\}\/\$\{entryId\}/);
});
