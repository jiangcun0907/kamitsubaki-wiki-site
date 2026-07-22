/** Strictly verify song timeline safety and localized lyric structure. */

import fs from 'node:fs';
import path from 'node:path';

import { lrcTimeToSeconds } from './lyrics-timestamp-utils.mjs';

const SONGS_DIR = path.join(process.cwd(), 'src/content/songs');
const TIMESTAMP_PATTERN = /\[(\d{2,3}:\d{2}\.\d{2,3})\]/gu;
const strict = process.argv.includes('--strict');
const verbose = process.argv.includes('--verbose') || strict;
const CONTAMINATION_MARKERS = [
  '风花雪月汉化组',
  'NSAD12B',
  '企鹅1626345230',
  '你在周围看什么呢',
];

async function findMarkdownFiles(directory, files = []) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await findMarkdownFiles(fullPath, files);
    else if (entry.name.endsWith('.md') && entry.name !== 'README.md') files.push(fullPath);
  }
  return files;
}

function parseDuration(content) {
  const match = content.match(/^duration:\s*["']?(\d+):(\d{2})["']?\s*$/mu);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function timestamps(value) {
  return [...String(value).matchAll(TIMESTAMP_PATTERN)].map((match) => ({
    label: match[1],
    seconds: lrcTimeToSeconds(match[1]),
  }));
}

const files = await findMarkdownFiles(SONGS_DIR);
const failures = [];
const counts = {
  contamination: 0,
  decreasing: 0,
  durationOverflow: 0,
  duplicateLocalizedContainer: 0,
  localizedTimestampMismatch: 0,
  invalidTimestamp: 0,
};
let timedFiles = 0;

function fail(category, message) {
  counts[category] += 1;
  failures.push(message);
}

for (const filePath of files) {
  const content = await fs.promises.readFile(filePath, 'utf8');
  const relativePath = path.relative(process.cwd(), filePath);
  const duration = parseDuration(content);

  for (const marker of CONTAMINATION_MARKERS) {
    if (content.includes(marker)) fail('contamination', `${relativePath}: contamination marker ${JSON.stringify(marker)}`);
  }

  const allTimes = timestamps(content);
  if (allTimes.length > 0) timedFiles += 1;
  for (const time of allTimes) {
    if (!Number.isFinite(time.seconds) || Number(time.label.split(':')[1].split('.')[0]) >= 60) {
      fail('invalidTimestamp', `${relativePath}: invalid timestamp ${time.label}`);
    }
    if (duration !== null && time.seconds > duration + 10) {
      fail('durationOverflow', `${relativePath}: ${time.label} exceeds ${duration}s duration by more than 10s`);
    }
  }

  const japaneseTimes = [];
  const japanesePattern = /<div class="jp-lyric">\r?\n?([\s\S]*?)\r?\n?<\/div>/gu;
  let japaneseMatch;
  while ((japaneseMatch = japanesePattern.exec(content))) {
    const time = timestamps(japaneseMatch[1])[0];
    if (time) japaneseTimes.push(time);
  }
  for (let index = 1; index < japaneseTimes.length; index += 1) {
    if (japaneseTimes[index].seconds < japaneseTimes[index - 1].seconds) {
      fail('decreasing', `${relativePath}: ${japaneseTimes[index].label} follows ${japaneseTimes[index - 1].label}`);
    }
  }

  const linePattern = /<div class="lyric-line">\r?\n([\s\S]*?)<\/div>\r?\n<\/div>/gu;
  let lineMatch;
  let lineNumber = 0;
  while ((lineMatch = linePattern.exec(content))) {
    lineNumber += 1;
    const classCounts = new Map();
    const containerPattern = /<div class="(jp|cn|en|trans)-lyric">\r?\n?([\s\S]*?)<\/div>/gu;
    const localizedTimes = [];
    let containerMatch;
    while ((containerMatch = containerPattern.exec(lineMatch[1]))) {
      const className = containerMatch[1];
      classCounts.set(className, (classCounts.get(className) || 0) + 1);
      const time = timestamps(containerMatch[2])[0];
      if (time) localizedTimes.push(time.label);
    }
    for (const [className, count] of classCounts) {
      if (count > 1) {
        fail('duplicateLocalizedContainer', `${relativePath}: lyric line ${lineNumber} has ${count} ${className}-lyric containers`);
      }
    }
    if (localizedTimes.length > 1 && new Set(localizedTimes).size > 1) {
      fail('localizedTimestampMismatch', `${relativePath}: localized timestamps differ at lyric line ${lineNumber}`);
    }
  }
}

console.log(JSON.stringify({ files: files.length, timedFiles, failures: failures.length, counts }, null, 2));
if (failures.length > 0) {
  console.error(`Found ${failures.length} lyric safety failure(s).`);
  if (verbose) console.error(failures.slice(0, 100).join('\n'));
  if (strict) process.exitCode = 1;
}
