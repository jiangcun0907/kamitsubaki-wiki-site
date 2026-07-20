import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';

import { renderMarkdownFragment } from '../src/lib/markdown.mjs';

const projectRoot = new URL('../', import.meta.url);
const locales = ['zh', 'ja', 'en'];

const albums = [
  'guwa',
  'guwa-gamma',
  'i-scream-live',
  'i-scream-live-2',
  'i-scream-live-3',
  'i-scream-live-4',
  'kansoku',
  'kansoku-gamma',
  'kyoso',
  'kyoso-gamma',
  'maho',
  'maho-gamma',
  'shinai',
  'tomadoi-telepathy',
  'yoru-ga-furiyamu-mae-ni',
];

const songs = [
  ['shi', 'BV1CJ411b7Ym', '3Wtx6k2vInU', '1688351145', '1399849873'],
  ['shinzou-to-karakuri', 'BV1cJ41187UD', 'hcm1LGOxJbc', '1688351147', '1399847991'],
  ['majo', 'BV1FJ41187QY', 'AqwFHfsAlx0', '1688156970', '1365461591'],
  ['wasurete-shimae', 'BV1wJ41187mP', '2Nj1l-S2FJU', '1688351146', '1399847997'],
  ['hinadori', 'BV1wJ411873J', 'M1RIUrgJqWw', '1688351155', '1399847994'],
  ['kako-wo-kurau', 'BV1wJ41187Kd', 'tMKrECxEpq8', '1688351153', '1399847996'],
  ['yoru-ga-furiyamu-mae-ni', 'BV1wJ41187KH', 'dledRqPTNT8', '1688351156', '1399849875'],
  ['soshite-hana-ni-naru', 'BV1AJ41187Qi', 'y6TGSY9Zll0', '1688351158', '1399849878'],
  ['quiz', 'BV1AJ41187pR', 'n0ov2G-_UvU', '1688351148', '1399847995'],
  ['yakou-bus-nite', 'BV1AJ411875A', 'RDnArlYduBs', '1688351150', '1399847993'],
];

function fileUrl(path) {
  return new URL(path, projectRoot);
}

async function readEntry(path) {
  const source = await readFile(fileUrl(path), 'utf8');
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, `${path} must contain frontmatter`);
  return { source, data: parse(match[1]) };
}

function readJpegDimensions(buffer) {
  assert.equal(buffer.readUInt16BE(0), 0xffd8, 'cover must be a JPEG');
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
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += length + 2;
  }

  throw new Error('JPEG dimensions not found');
}

test('KAF album catalog contains 15 localized releases with original Apple Music artwork', async () => {
  const albumDirectories = (await readdir(fileUrl('src/content/albums/kaf'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(albumDirectories, [...albums].sort());

  for (const album of albums) {
    const translations = await Promise.all(
      locales.map((locale) => readEntry(`src/content/albums/kaf/${album}/${locale}.md`)),
    );
    const translationKeys = new Set(translations.map(({ data }) => data.translationKey));
    assert.equal(translationKeys.size, 1, `${album} translations must share a key`);

    for (const { data, source } of translations) {
      assert.equal(data.image, `/images/albums/kaf/${album}.jpg`);
      assert.match(data.officialLinks[0].href, /^https:\/\/music\.apple\.com\/jp\/album\//);
      assert.doesNotMatch(source, /placehold|200x200/i);
    }

    const coverPath = `public/images/albums/kaf/${album}.jpg`;
    const cover = await readFile(fileUrl(coverPath));
    const coverStats = await stat(fileUrl(coverPath));
    const dimensions = readJpegDimensions(cover);
    assert.ok(coverStats.size > 100_000, `${album} cover must not be a thumbnail`);
    assert.ok(dimensions.width >= 1500, `${album} cover must be at least 1500px wide`);
    assert.equal(dimensions.width, dimensions.height, `${album} cover must remain square`);
  }
});

test('KAF first 10 original songs use localized, ordered aggregate media embeds', async () => {
  const songDirectories = (await readdir(fileUrl('src/content/songs/kaf/originals'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(songDirectories, songs.map(([slug]) => slug).sort());

  for (const [index, [song, bv, youtube, appleMusic, netease]] of songs.entries()) {
    const translations = await Promise.all(
      locales.map((locale) => readEntry(`src/content/songs/kaf/originals/${song}/${locale}.md`)),
    );
    const translationKeys = new Set(translations.map(({ data }) => data.translationKey));
    assert.equal(translationKeys.size, 1, `${song} translations must share a key`);

    for (const { data, source } of translations) {
      assert.equal(data.artistId, 'kaf');
      assert.equal(data.itemOrder, index + 1);
      assert.equal(data.code, `KO${index + 1}`);
      assert.equal(data.image, undefined, `${song} must use artist artwork only through the rendering fallback`);
      assert.match(source, /\{\{media-switcher::[^\n]+\}\}/);
      assert.match(source, /\{\{\/media-switcher\}\}/);
      assert.match(source, new RegExp(`@\\[bilibili\\]\\(${bv.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      assert.match(source, new RegExp(`@\\[youtube\\]\\(${youtube.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      assert.match(source, new RegExp(`@\\[apple-music\\]\\(https://music\\.apple\\.com/jp/song/${appleMusic}`));
      assert.match(source, new RegExp(`@\\[netease\\]\\(${netease}`));

      const providerOffsets = ['bilibili', 'youtube', 'apple-music', 'netease']
        .map((provider) => source.indexOf(`@[${provider}](`));
      assert.ok(providerOffsets.every((offset) => offset >= 0), `${song} must include all four media providers`);
      assert.deepEqual(
        providerOffsets,
        [...providerOffsets].sort((a, b) => a - b),
        `${song} providers must stay ordered as Bilibili, YouTube, Apple Music, NetEase`,
      );
      const aggregateSource = source.match(/\{\{media-switcher::[^\n]+\}\}[\s\S]*?\{\{\/media-switcher\}\}/)?.[0];
      assert.ok(aggregateSource, `${song} must contain a complete aggregate media block`);
      const aggregateHtml = await renderMarkdownFragment(aggregateSource);
      assert.equal((aggregateHtml.match(/data-media-switcher-tab/g) || []).length, 4);
      assert.equal((aggregateHtml.match(/<iframe /g) || []).length, 4);
      assert.doesNotMatch(source, /<iframe\b/i);
      assert.doesNotMatch(source, /placehold/i);
    }
  }
});
