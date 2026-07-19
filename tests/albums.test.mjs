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

test('music pages use artist-first song navigation and a flat album catalog', async () => {
  const [subnav, songsPage, artistSongsPage, albumsPage, albumDetail] = await Promise.all([
    readProjectFile('../src/components/MusicSubnav.astro'),
    readProjectFile('../src/pages/[locale]/songs/index.astro'),
    readProjectFile('../src/pages/[locale]/songs/artists/[artist].astro'),
    readProjectFile('../src/pages/[locale]/albums/index.astro'),
    readProjectFile('../src/pages/[locale]/albums/[...id].astro'),
  ]);

  assert.match(subnav, /current === 'songs'/);
  assert.match(subnav, /current === 'albums'/);
  assert.match(songsPage, /buildArtistSongCatalog/);
  assert.match(songsPage, /songs\/artists\/\$\{group\.slug\}/);
  assert.match(artistSongsPage, /buildArtistSongCatalog/);
  assert.match(artistSongsPage, /category\.entries\.map/);
  assert.match(artistSongsPage, /songs\/\$\{songPath\}/);
  assert.doesNotMatch(albumsPage, /groupMusicByArtist/);
  assert.match(albumsPage, /sortedAlbums\.map/);
  assert.match(albumDetail, /<MusicSubnav locale=\{localeCode\} current="albums"/);
});

test('song catalog uses artist entry artwork and folder-driven categories', async () => {
  const { buildArtistSongCatalog, parseSongCatalogPath } = await import('../src/lib/musicCatalog.mjs');
  const songs = [
    { id: 'kaf/originals/shi/zh', data: { artist: '花譜', artistId: 'kaf', title: '糸', itemOrder: 1 } },
    { id: 'kaf/covers/example/zh', data: { artist: '花譜', artistId: 'kaf', title: 'Example cover', itemOrder: 1 } },
    { id: 'kaf-genealogy/example/zh', data: { artist: '花譜', artistId: 'kaf', title: 'Legacy path' } },
  ];
  const artists = [{
    id: 'vwp/kaf/zh',
    data: {
      translationKey: 'kaf',
      name: '花譜',
      romanizedName: 'KAF',
      image: '/images/artists/kaf.webp',
      categoryOrder: 1,
      itemOrder: 1,
    },
  }];

  const [catalog] = buildArtistSongCatalog(songs, artists, 'zh');
  assert.equal(catalog.cover, '/images/artists/kaf.webp');
  assert.equal(catalog.artistPath, 'vwp/kaf');
  assert.deepEqual(
    catalog.categories.map((category) => ({ slug: category.slug, title: category.title, size: category.entries.length })),
    [
      { slug: 'originals', title: '原创曲', size: 1 },
      { slug: 'covers', title: '翻唱曲', size: 1 },
      { slug: 'genealogy', title: '系谱曲', size: 1 },
    ],
  );
  assert.equal(parseSongCatalogPath('kaf/originals/shi/zh', 'kaf').songPath, 'kaf/originals/shi');
  assert.equal(parseSongCatalogPath('kaf-covers/example/zh', 'kaf').categorySlug, 'covers');
});

test('music catalog groups entries by artist with stable anchors', async () => {
  const { groupMusicByArtist, toArtistAnchor } = await import('../src/lib/musicCatalog.mjs');
  const entries = [
    { id: 'songs/b', data: { artist: 'V.W.P', artistId: 'vwp', title: 'B' } },
    { id: 'songs/a', data: { artist: 'KAF', title: 'A' } },
    { id: 'songs/c', data: { artist: 'VWP', artistId: 'vwp', title: 'C' } },
  ];

  assert.equal(toArtistAnchor('V.W.P'), 'artist-v-w-p');
  assert.deepEqual(
    groupMusicByArtist(entries).map((group) => ({ artist: group.artist, id: group.id, size: group.entries.length })),
    [
      { artist: 'KAF', id: 'artist-kaf', size: 1 },
      { artist: 'V.W.P', id: 'artist-vwp', size: 2 },
    ],
  );
});

test('album track links are emitted only for localized song entries', async () => {
  const detailPage = await readProjectFile('../src/pages/[locale]/albums/[...id].astro');

  assert.match(detailPage, /getCollection\('songs'\)/);
  assert.match(detailPage, /song\.data\.locale === localeCode/);
  assert.match(detailPage, /localizedSongIds\.has\(track\.songId\)/);
});

test('work schemas share validated dates, durations, and safe links', async () => {
  const config = await readProjectFile('../src/content.config.ts');

  assert.match(config, /const workBaseSchema = z\.object/);
  assert.match(config, /schema: workBaseSchema\.extend/);
  assert.match(config, /Expected YYYY, YYYY-MM, or YYYY-MM-DD/);
  assert.match(config, /Expected MM:SS or HH:MM:SS/);
  assert.match(config, /Must be an HTTP\(S\) URL or a site-relative path/);
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
