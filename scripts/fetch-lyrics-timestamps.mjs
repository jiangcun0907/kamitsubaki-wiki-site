/**
 * Fetch synchronized LRC data for song entries.
 *
 * Provider order: curated NetEase ID, LRCLIB, NetEase search, QQ Music, Kugou.
 * Search order: complete title + artist first; only then remove a trailing feat.
 * A result is cached only when metadata and the local Japanese lyric text align.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  alignLyrics,
  buildSearchVariants,
  decodeNumericEntities,
  extractLocalLyricLines,
  isReliableAlignment,
  parseLrc,
  rankTrackCandidates,
} from './lyrics-timestamp-utils.mjs';

const SONGS_DIR = path.join(process.cwd(), 'src/content/songs');
const CACHE_FILE = path.join(process.cwd(), 'scripts/lyrics-cache.json');
const CLIENT_ID = 'kamitsubaki-wiki-lyrics/3.0 (https://github.com/KiRenk0/kamitsubaki-wiki-site)';
const REQUEST_DELAY_MS = 300;
const REQUEST_TIMEOUT_MS = 15_000;

const argumentsList = process.argv.slice(2);
const dryRun = argumentsList.includes('--dry-run');
const refreshAll = argumentsList.includes('--refresh-all');
const listOnly = argumentsList.includes('--list-only');
const keyFilter = argumentsList.find((argument) => argument.startsWith('--key='))?.slice('--key='.length);
const limit = Number.parseInt(
  argumentsList.find((argument) => argument.startsWith('--limit='))?.slice('--limit='.length) || '0',
  10,
);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let lastRequestAt = 0;

async function requestJson(url, options = {}, attempt = 0) {
  const wait = Math.max(0, REQUEST_DELAY_MS - (Date.now() - lastRequestAt));
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      const retryAfter = Number(response.headers.get('retry-after')) || attempt + 1;
      await sleep(Math.min(5_000, retryAfter * 1_000));
      return requestJson(url, options, attempt + 1);
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return JSON.parse(await response.text());
  } catch (error) {
    if (attempt < 1 && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return requestJson(url, options, attempt + 1);
    }
    throw error;
  }
}

async function findAllMarkdownFiles(directory, files = []) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await findAllMarkdownFiles(fullPath, files);
    else if (entry.name.endsWith('.md') && entry.name !== 'README.md') files.push(fullPath);
  }
  return files;
}

function parseFrontmatter(content) {
  const block = content.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1];
  if (!block) return {};
  const frontmatter = {};
  for (const line of block.split(/\r?\n/u)) {
    const match = line.match(/^(\w+):\s*(?:"([^"]*)"|'([^']*)'|(.+))$/u);
    if (!match) continue;
    frontmatter[match[1]] = (match[2] ?? match[3] ?? match[4]).trim();
  }
  return frontmatter;
}

function parseDuration(value) {
  const match = String(value || '').match(/^(\d+):(\d{2})$/u);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

function extractNeteaseId(content) {
  return content.match(/@\[netease\]\((\d+)/u)?.[1] || null;
}

function artistNames(value) {
  if (Array.isArray(value)) return value.map((artist) => artist.name).filter(Boolean).join('/');
  return String(value || '');
}

const browserHeaders = {
  'User-Agent': 'Mozilla/5.0',
};

async function searchLrclib(target) {
  const query = new URLSearchParams({
    track_name: target.title,
    artist_name: target.artist,
  });
  const records = await requestJson(`https://lrclib.net/api/search?${query}`, {
    headers: { 'User-Agent': CLIENT_ID },
  });
  return (Array.isArray(records) ? records : [])
    .filter((record) => record.syncedLyrics)
    .map((record) => ({
      id: record.id,
      title: record.trackName,
      artist: record.artistName,
      duration: record.duration,
      lrcText: record.syncedLyrics,
    }));
}

async function searchNetease(target) {
  const query = encodeURIComponent(`${target.title} ${target.artist}`);
  const data = await requestJson(
    `https://music.163.com/api/search/get/web?csrf_token=&s=${query}&type=1&offset=0&total=true&limit=10`,
    { headers: { ...browserHeaders, Referer: 'https://music.163.com/' } },
  );
  return (data?.result?.songs || []).map((song) => ({
    id: song.id,
    title: song.name,
    artist: artistNames(song.artists),
    duration: Number(song.duration) / 1_000,
  }));
}

async function fetchNeteaseLyrics(id) {
  const data = await requestJson(`https://music.163.com/api/song/lyric?id=${id}&lv=1`, {
    headers: { ...browserHeaders, Referer: 'https://music.163.com/' },
  });
  return data?.lrc?.lyric || null;
}

async function searchQQMusic(target) {
  const query = encodeURIComponent(`${target.title} ${target.artist}`);
  const data = await requestJson(
    `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=10&w=${query}&format=json`,
    { headers: { ...browserHeaders, Referer: 'https://y.qq.com/' } },
  );
  return (data?.data?.song?.list || []).map((song) => ({
    id: song.songmid,
    title: decodeNumericEntities(song.songname),
    artist: decodeNumericEntities(artistNames(song.singer)),
    duration: Number(song.interval),
  }));
}

async function fetchQQMusicLyrics(songmid) {
  const data = await requestJson(
    `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${songmid}&format=json&nobase64=1`,
    { headers: { ...browserHeaders, Referer: 'https://y.qq.com/' } },
  );
  return data?.lyric ? decodeNumericEntities(data.lyric) : null;
}

async function searchKugou(target) {
  const query = encodeURIComponent(`${target.title} ${target.artist}`);
  const data = await requestJson(
    `https://songsearch.kugou.com/song_search_v2?keyword=${query}&page=1&pagesize=10&platform=WebFilter&filter=2&iscorrection=1&privilege_filter=0`,
    { headers: { ...browserHeaders, Referer: 'https://www.kugou.com/' } },
  );
  return (data?.data?.lists || []).map((song) => ({
    id: song.EMixSongID || song.FileHash,
    hash: song.FileHash,
    title: decodeNumericEntities(song.SongName),
    artist: decodeNumericEntities(song.SingerName),
    duration: Number(song.Duration),
  }));
}

async function fetchKugouLyrics(candidate) {
  if (!candidate.hash) return null;
  const search = await requestJson(
    `https://lyrics.kugou.com/search?ver=1&man=yes&client=pc&hash=${encodeURIComponent(candidate.hash)}`,
    { headers: browserHeaders },
  );
  const lyricCandidate = search?.candidates?.[0];
  if (!lyricCandidate) return null;
  const data = await requestJson(
    `https://lyrics.kugou.com/download?ver=1&client=pc&id=${lyricCandidate.id}&accesskey=${encodeURIComponent(lyricCandidate.accesskey)}&fmt=lrc&charset=utf8`,
    { headers: browserHeaders },
  );
  return data?.content ? Buffer.from(data.content, 'base64').toString('utf8') : null;
}

const providers = [
  { name: 'lrclib', search: searchLrclib, fetchLyrics: (candidate) => candidate.lrcText },
  { name: 'netease', search: searchNetease, fetchLyrics: (candidate) => fetchNeteaseLyrics(candidate.id) },
  { name: 'qqmusic', search: searchQQMusic, fetchLyrics: (candidate) => fetchQQMusicLyrics(candidate.id) },
  { name: 'kugou', search: searchKugou, fetchLyrics: fetchKugouLyrics },
];

function evaluateLyrics(lrcText, referenceLines) {
  const parsed = parseLrc(lrcText);
  if (parsed.length === 0) return null;
  const alignment = alignLyrics(referenceLines, parsed);
  return isReliableAlignment(alignment) ? { parsed, alignment } : null;
}

async function tryCuratedNetease(group) {
  if (!group.neteaseId) return null;
  try {
    const lrcText = await fetchNeteaseLyrics(group.neteaseId);
    const evaluated = lrcText && evaluateLyrics(lrcText, group.referenceLines);
    if (!evaluated) return null;
    return {
      source: 'netease',
      candidate: { id: group.neteaseId, title: group.title, artist: group.artist },
      variant: { title: group.title, artist: group.artist, featFallback: false },
      metadataMatch: null,
      ...evaluated,
    };
  } catch (error) {
    console.warn(`    netease id ${group.neteaseId}: ${error.message}`);
    return null;
  }
}

async function searchProvider(provider, variant, group) {
  try {
    const candidates = await provider.search(variant);
    const ranked = rankTrackCandidates(candidates, { ...variant, duration: group.duration });
    for (const { candidate, match } of ranked.slice(0, 3)) {
      const lrcText = await provider.fetchLyrics(candidate);
      const evaluated = lrcText && evaluateLyrics(lrcText, group.referenceLines);
      if (!evaluated) continue;
      return {
        source: provider.name,
        candidate,
        variant,
        metadataMatch: match,
        ...evaluated,
      };
    }
  } catch (error) {
    console.warn(`    ${provider.name}: ${error.message}`);
  }
  return null;
}

async function fetchGroup(group) {
  const curated = await tryCuratedNetease(group);
  if (curated) return curated;

  const variants = buildSearchVariants(group.titles, group.artists);
  for (const variant of variants.filter((candidate) => !candidate.featFallback)) {
    for (const provider of providers) {
      const result = await searchProvider(provider, variant, group);
      if (result) return result;
    }
  }
  for (const variant of variants.filter((candidate) => candidate.featFallback)) {
    for (const provider of providers) {
      const result = await searchProvider(provider, variant, group);
      if (result) return result;
    }
  }
  return null;
}

function saveCache(cache) {
  if (dryRun) return;
  fs.writeFileSync(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

async function collectGroups() {
  const groups = new Map();
  for (const filePath of await findAllMarkdownFiles(SONGS_DIR)) {
    const content = await fs.promises.readFile(filePath, 'utf8');
    if (!content.includes('my-lyric-box')) continue;
    const frontmatter = parseFrontmatter(content);
    if (!frontmatter.translationKey || !frontmatter.title || !frontmatter.artist) continue;

    const group = groups.get(frontmatter.translationKey) || {
      key: frontmatter.translationKey,
      title: frontmatter.title,
      artist: frontmatter.artist,
      duration: parseDuration(frontmatter.duration),
      titles: [],
      artists: [],
      referenceLines: [],
      neteaseId: null,
      files: [],
    };
    if (!group.titles.includes(frontmatter.title)) group.titles.push(frontmatter.title);
    if (!group.artists.includes(frontmatter.artist)) group.artists.push(frontmatter.artist);
    if (frontmatter.locale === 'ja') {
      group.title = frontmatter.title;
      group.artist = frontmatter.artist;
    }
    const lines = extractLocalLyricLines(content);
    if (lines.length > group.referenceLines.length) group.referenceLines = lines;
    group.neteaseId ||= extractNeteaseId(content);
    group.files.push(filePath);
    groups.set(frontmatter.translationKey, group);
  }
  return groups;
}

async function main() {
  const cache = fs.existsSync(CACHE_FILE)
    ? JSON.parse(await fs.promises.readFile(CACHE_FILE, 'utf8'))
    : {};
  const groups = await collectGroups();
  let pending = [...groups.values()].filter((group) => {
    if (keyFilter && group.key !== keyFilter) return false;
    const cachedRows = cache[group.key]?.syncedLyrics;
    const cacheIsReliable = Array.isArray(cachedRows)
      && cachedRows.length > 0
      && isReliableAlignment(alignLyrics(group.referenceLines, cachedRows));
    return refreshAll || !cacheIsReliable;
  });
  if (Number.isFinite(limit) && limit > 0) pending = pending.slice(0, limit);

  console.log(`Unique lyric groups: ${groups.size}`);
  console.log(`Queries scheduled: ${pending.length}${dryRun ? ' (dry run)' : ''}`);
  if (listOnly) return;

  let found = 0;
  let missing = 0;
  const sourceCounts = {};
  for (let index = 0; index < pending.length; index += 1) {
    const group = pending[index];
    process.stdout.write(`[${index + 1}/${pending.length}] ${group.title} — ${group.artist} ... `);
    const result = await fetchGroup(group);
    if (!result) {
      missing += 1;
      cache[group.key] = {
        title: group.title,
        artist: group.artist,
        source: null,
        syncedLyrics: [],
        checkedAt: new Date().toISOString(),
      };
      console.log('not found or lyric alignment rejected');
    } else {
      found += 1;
      sourceCounts[result.source] = (sourceCounts[result.source] || 0) + 1;
      cache[group.key] = {
        title: group.title,
        artist: group.artist,
        source: result.source,
        sourceTrackId: String(result.candidate.id),
        matchedTitle: result.candidate.title,
        matchedArtist: result.candidate.artist,
        featFallback: result.variant.featFallback,
        alignment: {
          matched: result.alignment.matched,
          total: result.alignment.total,
          coverage: Number(result.alignment.coverage.toFixed(4)),
          meanScore: Number(result.alignment.meanScore.toFixed(4)),
        },
        syncedLyrics: result.parsed,
        checkedAt: new Date().toISOString(),
      };
      console.log(`${result.source}, ${result.alignment.matched}/${result.alignment.total} lines${result.variant.featFallback ? ', feat fallback' : ''}`);
    }
    if ((index + 1) % 5 === 0) saveCache(cache);
  }
  saveCache(cache);

  console.log('\nResults');
  console.log(`  Found: ${found}`);
  console.log(`  Rejected or missing: ${missing}`);
  console.log(`  Sources: ${JSON.stringify(sourceCounts)}`);
  console.log(`  Cache: ${dryRun ? 'unchanged' : CACHE_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
