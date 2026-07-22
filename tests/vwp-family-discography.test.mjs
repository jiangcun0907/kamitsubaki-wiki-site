import assert from 'node:assert/strict';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';

import { assertNoPlaceholderContent } from './helpers/content-assertions.mjs';

const projectRoot = new URL('../', import.meta.url);
const locales = ['zh', 'ja', 'en'];
const albumCounts = { vwp: 10, rim: 8, harusaruhi: 9, isekaijoucho: 6, koko: 4 };
const canonicalSongCounts = { vwp: 117, rim: 131, harusaruhi: 169, isekaijoucho: 141, koko: 76 };
const physicalOnlyAlbums = new Set([
  'rim/chocolate-live',
  'harusaruhi/cream-puff-live',
  'isekaijoucho/candy-live',
  'koko/arare-live',
]);

function fileUrl(path) {
  return new URL(path, projectRoot);
}

async function readEntry(path) {
  const source = await readFile(fileUrl(path), 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  assert.ok(match, `${path} must contain frontmatter`);
  return { source, data: parse(match[1]) };
}

async function directories(path) {
  return (await readdir(fileUrl(path), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readJpegDimensions(buffer) {
  assert.equal(buffer.readUInt16BE(0), 0xffd8, 'artwork must be a JPEG');
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += length + 2;
  }
  throw new Error('JPEG dimensions not found');
}

test('V.W.P and the four newly completed member catalogs contain 37 localized releases', async () => {
  const linkedSongIds = new Set();
  for (const [artist, expectedCount] of Object.entries(albumCounts)) {
    const albums = await directories(`src/content/albums/${artist}`);
    assert.equal(albums.length, expectedCount, `${artist} album count must stay complete`);

    for (const album of albums) {
      const translations = await Promise.all(
        locales.map((locale) => readEntry(`src/content/albums/${artist}/${album}/${locale}.md`)),
      );
      const [canonical, ...localized] = translations;
      assert.equal(new Set(translations.map(({ data }) => data.translationKey)).size, 1);
      assert.equal(canonical.data.trackCount, canonical.data.tracks.length, `${artist}/${album} track count`);
      for (const { data, source } of localized) {
        assert.deepEqual(data.tracks, canonical.data.tracks, `${artist}/${album} localized tracks`);
        assertNoPlaceholderContent(source);
        assert.match(source, new RegExp(`https://vgmdb\\.net/artist/`));
      }
      for (const track of canonical.data.tracks) {
        if (/^MC\d*$/i.test(track.title)) {
          assert.equal(track.songId, undefined, `${artist}/${album} MC must not create a song entry`);
        } else {
          assert.match(track.songId, /^(?:vwp|rim|harusaruhi|isekaijoucho|koko)\//);
          linkedSongIds.add(track.songId);
        }
      }

      const coverPath = `public/images/albums/${artist}/${album}.jpg`;
      const cover = await readFile(fileUrl(coverPath));
      const dimensions = readJpegDimensions(cover);
      assert.ok((await stat(fileUrl(coverPath))).size > 100_000, `${coverPath} must not be a thumbnail`);
      if (physicalOnlyAlbums.has(`${artist}/${album}`)) {
        assert.ok(dimensions.width >= 1000, `${coverPath} must preserve the official physical artwork`);
      } else {
        assert.ok(dimensions.width >= 1600, `${coverPath} must use native Apple artwork`);
        assert.equal(dimensions.width, dimensions.height, `${coverPath} must remain square`);
      }
    }
  }

  for (const songId of linkedSongIds) {
    for (const locale of locales) await access(fileUrl(`src/content/songs/${songId}/${locale}.md`));
  }
});

test('all 634 canonical V.W.P-family recordings are trilingual, credited, unique, and locally illustrated', async () => {
  const checkedArtwork = new Set();
  const songPathsByCode = new Map();
  let totalSongs = 0;

  for (const [artist, expectedCount] of Object.entries(canonicalSongCounts)) {
    const categories = await directories(`src/content/songs/${artist}`);
    let artistSongs = 0;
    for (const category of categories) {
      const songs = await directories(`src/content/songs/${artist}/${category}`);
      artistSongs += songs.length;
      for (const song of songs) {
        const translations = await Promise.all(
          locales.map((locale) => readEntry(`src/content/songs/${artist}/${category}/${song}/${locale}.md`)),
        );
        const songPath = `${artist}/${category}/${song}`;
        assert.equal(new Set(translations.map(({ data }) => data.translationKey)).size, 1);
        const existingPath = songPathsByCode.get(translations[0].data.code);
        assert.equal(existingPath, undefined, `${songPath} duplicates the recording stored at ${existingPath}`);
        songPathsByCode.set(translations[0].data.code, songPath);
        for (const { data, source } of translations) {
          assert.equal(data.artistId, artist);
          assert.ok(data.artistIds.includes(artist));
          assert.ok(data.image.startsWith('/images/'));
          assertNoPlaceholderContent(source, { forbidRawIframe: true });
          assert.match(source, /^## (?:歌词|歌詞|Lyrics)$/m);
          await access(fileUrl(`public/${data.image.slice(1)}`));
          checkedArtwork.add(`public/${data.image.slice(1)}`);
        }
      }
    }
    assert.equal(artistSongs, expectedCount, `${artist} song count must stay complete`);
    totalSongs += artistSongs;
  }
  assert.equal(totalSongs, 634);

  for (const artworkPath of checkedArtwork) {
    const artwork = await readFile(fileUrl(artworkPath));
    const dimensions = readJpegDimensions(artwork);
    if (!physicalOnlyAlbums.has(artworkPath.replace('public/images/albums/', '').replace('.jpg', ''))) {
      assert.ok(dimensions.width >= 1600, `${artworkPath} must not be a thumbnail`);
      assert.equal(dimensions.width, dimensions.height, `${artworkPath} must remain square`);
    }
  }
});

test('V.W.P songs are shared with every member catalog without duplicate content files', async () => {
  const { buildArtistSongCatalog } = await import('../src/lib/musicCatalog.mjs');
  const entry = {
    id: 'vwp/genealogy/example/zh',
    data: {
      artist: 'V.W.P', artistId: 'vwp',
      artistIds: ['vwp', 'kaf', 'rim', 'harusaruhi', 'isekaijoucho', 'koko'],
      title: 'Example',
    },
  };
  const catalog = buildArtistSongCatalog([entry], [], 'zh');
  assert.deepEqual(catalog.map(({ slug }) => slug).sort(), ['harusaruhi', 'isekaijoucho', 'kaf', 'koko', 'rim', 'vwp']);
  assert.ok(catalog.every(({ entries }) => entries.length === 1));
});

test('a collaboration is stored once and linked from every credited artist catalog', async () => {
  const { buildArtistSongCatalog } = await import('../src/lib/musicCatalog.mjs');
  const canonicalPath = 'src/content/songs/harusaruhi/collaborations/古傷-furukizu/zh.md';
  const duplicatePath = 'src/content/songs/koko/collaborations/古傷-furukizu/zh.md';
  const source = await readFile(fileUrl(canonicalPath), 'utf8');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  assert.ok(frontmatter, `${canonicalPath} must contain frontmatter`);
  const data = parse(frontmatter[1]);

  await assert.rejects(access(fileUrl(duplicatePath)));
  assert.deepEqual(data.artistIds, ['harusaruhi', 'koko']);

  const entry = { id: 'harusaruhi/collaborations/古傷-furukizu/zh', data };
  const catalog = buildArtistSongCatalog([entry], [], 'zh');
  assert.deepEqual(catalog.map(({ slug }) => slug).sort(), ['harusaruhi', 'koko']);
  assert.ok(catalog.every(({ categories }) =>
    categories.length === 1
    && categories[0].slug === 'collaborations'
    && categories[0].entries[0] === entry));

  const redirects = await readFile(fileUrl('public/_redirects'), 'utf8');
  assert.match(
    redirects,
    /\/zh\/songs\/koko\/collaborations\/古傷-furukizu \/zh\/songs\/harusaruhi\/collaborations\/古傷-furukizu 301/,
  );
});
