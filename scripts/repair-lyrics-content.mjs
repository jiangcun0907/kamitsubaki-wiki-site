/** One-time repair for quarantined and structurally unsafe lyric content. */

import fs from 'node:fs';
import path from 'node:path';

import { lrcTimeToSeconds } from './lyrics-timestamp-utils.mjs';

const SONGS_DIR = path.join(process.cwd(), 'src/content/songs');
const CACHE_FILE = path.join(process.cwd(), 'scripts/lyrics-cache.json');
const TIMESTAMP_PATTERN = /\[\d{2,3}:\d{2}\.\d{2,3}\]/gu;
const QUARANTINE_MARKERS = ['风花雪月汉化组', 'NSAD12B', '企鹅1626345230', '你在周围看什么呢'];

async function findMarkdownFiles(directory, files = []) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await findMarkdownFiles(fullPath, files);
    else if (entry.name.endsWith('.md') && entry.name !== 'README.md') files.push(fullPath);
  }
  return files;
}

function frontmatterValue(content, name) {
  return content.match(new RegExp(`^${name}:\\s*(?:"([^"]*)"|'([^']*)'|(.+))$`, 'mu'))?.slice(1).find(Boolean)?.trim() || null;
}

function durationSeconds(content) {
  const value = frontmatterValue(content, 'duration');
  const match = value?.match(/^(\d+):(\d{2})$/u);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function japaneseTimes(content) {
  const times = [];
  const pattern = /<div class="jp-lyric">\r?\n?([\s\S]*?)\r?\n?<\/div>/gu;
  let match;
  while ((match = pattern.exec(content))) {
    const timestamp = match[1].match(TIMESTAMP_PATTERN)?.[0]?.slice(1, -1);
    if (timestamp) times.push(lrcTimeToSeconds(timestamp));
  }
  return times;
}

function deduplicateLocalizedContainers(content) {
  const linePattern = /<div class="lyric-line">\r?\n([\s\S]*?)<\/div>\r?\n<\/div>/gu;
  let removed = 0;
  const updated = content.replace(linePattern, (block) => {
    const seen = new Set();
    return block.replace(/<div class="(cn|en|trans)-lyric">\r?\n?[\s\S]*?<\/div>\r?\n?/gu, (container, className) => {
      if (!seen.has(className)) {
        seen.add(className);
        return container;
      }
      removed += 1;
      return '';
    });
  });
  return { content: updated, removed };
}

function quarantineLyrics(content, locale) {
  const messages = {
    zh: '该条目的歌词因来源污染已暂时下线，等待可靠来源重新核验。',
    ja: 'この項目の歌詞は出典データの汚染が確認されたため、一時的に非公開としています。',
    en: 'Lyrics are temporarily unavailable because the source data was found to be contaminated.',
  };
  const headings = { zh: '歌词', ja: '歌詞', en: 'Lyrics' };
  const heading = headings[locale] || 'Lyrics';
  return content.replace(/\n## (?:歌词|歌詞|Lyrics)\r?\n[\s\S]*$/u, `\n## ${heading}\n\n> ${messages[locale] || messages.en}\n`);
}

const files = await findMarkdownFiles(SONGS_DIR);
const records = [];
const quarantineKeys = new Set();
const invalidTimelineKeys = new Set();

for (const filePath of files) {
  const content = await fs.promises.readFile(filePath, 'utf8');
  const key = frontmatterValue(content, 'translationKey');
  const duration = durationSeconds(content);
  const times = japaneseTimes(content);
  const decreasing = times.some((time, index) => index > 0 && time < times[index - 1]);
  const overflowing = duration !== null && times.some((time) => time > duration + 10);
  if (key && (decreasing || overflowing)) invalidTimelineKeys.add(key);
  if (key && QUARANTINE_MARKERS.some((marker) => content.includes(marker))) quarantineKeys.add(key);
  records.push({ filePath, content, key, locale: frontmatterValue(content, 'locale') });
}

let updatedFiles = 0;
let removedDuplicateContainers = 0;
let strippedTimestampFiles = 0;
let quarantinedFiles = 0;
for (const record of records) {
  let next = record.content;
  if (record.key && quarantineKeys.has(record.key)) {
    next = quarantineLyrics(next, record.locale);
    quarantinedFiles += 1;
  } else {
    const deduplicated = deduplicateLocalizedContainers(next);
    next = deduplicated.content;
    removedDuplicateContainers += deduplicated.removed;
    if (record.key && invalidTimelineKeys.has(record.key) && /\[\d{2,3}:\d{2}\.\d{2,3}\]/u.test(next)) {
      next = next.replace(TIMESTAMP_PATTERN, '');
      strippedTimestampFiles += 1;
    }
    TIMESTAMP_PATTERN.lastIndex = 0;
  }
  if (next !== record.content) {
    await fs.promises.writeFile(record.filePath, next, 'utf8');
    updatedFiles += 1;
  }
}

const cache = JSON.parse(await fs.promises.readFile(CACHE_FILE, 'utf8'));
for (const key of quarantineKeys) {
  const previous = cache[key] || {};
  cache[key] = {
    title: previous.title,
    artist: previous.artist,
    source: null,
    syncedLyrics: [],
    quarantined: 'source-content-contamination',
  };
}
await fs.promises.writeFile(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  quarantineKeys: quarantineKeys.size,
  quarantinedFiles,
  invalidTimelineKeys: invalidTimelineKeys.size,
  strippedTimestampFiles,
  removedDuplicateContainers,
  updatedFiles,
}, null, 2));
