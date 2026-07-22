/** Verify timestamp ordering and localization consistency in song Markdown. */

import fs from 'node:fs';
import path from 'node:path';

import { lrcTimeToSeconds } from './lyrics-timestamp-utils.mjs';

const SONGS_DIR = path.join(process.cwd(), 'src/content/songs');
const TIMESTAMP_PATTERN = /\[(\d{2,3}:\d{2}\.\d{2,3})\]/u;
const strict = process.argv.includes('--strict');
const verbose = process.argv.includes('--verbose');

async function findMarkdownFiles(directory, files = []) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await findMarkdownFiles(fullPath, files);
    else if (entry.name.endsWith('.md') && entry.name !== 'README.md') files.push(fullPath);
  }
  return files;
}

const files = await findMarkdownFiles(SONGS_DIR);
const failures = [];
let timedFiles = 0;
let timedJapaneseLines = 0;

for (const filePath of files) {
  const content = await fs.promises.readFile(filePath, 'utf8');
  const relativePath = path.relative(process.cwd(), filePath);
  const japaneseTimes = [];
  const japanesePattern = /<div class="jp-lyric">\r?\n?([\s\S]*?)\r?\n?<\/div>/gu;
  let japaneseMatch;
  while ((japaneseMatch = japanesePattern.exec(content))) {
    const timestamp = japaneseMatch[1].match(TIMESTAMP_PATTERN)?.[1];
    if (timestamp) japaneseTimes.push(timestamp);
  }

  if (japaneseTimes.length > 0) {
    timedFiles += 1;
    timedJapaneseLines += japaneseTimes.length;
  }
  for (let index = 1; index < japaneseTimes.length; index += 1) {
    if (lrcTimeToSeconds(japaneseTimes[index]) < lrcTimeToSeconds(japaneseTimes[index - 1])) {
      failures.push(`${relativePath}: Japanese timestamps decrease at timed line ${index + 1}`);
    }
  }

  const linePattern = /<div class="lyric-line">\r?\n([\s\S]*?)<\/div>\r?\n<\/div>/gu;
  let lineMatch;
  let lineNumber = 0;
  while ((lineMatch = linePattern.exec(content))) {
    lineNumber += 1;
    const localizedTimes = [];
    const localizedPattern = /<div class="(?:jp|cn|en|trans)-lyric">\r?\n?\[(\d{2,3}:\d{2}\.\d{2,3})\]/gu;
    let localizedMatch;
    while ((localizedMatch = localizedPattern.exec(lineMatch[1]))) localizedTimes.push(localizedMatch[1]);
    if (localizedTimes.length > 1 && new Set(localizedTimes).size > 1) {
      failures.push(`${relativePath}: localized timestamps differ at lyric line ${lineNumber}`);
    }
  }
}

console.log(JSON.stringify({
  files: files.length,
  timedFiles,
  timedJapaneseLines,
  failures: failures.length,
}, null, 2));
if (failures.length > 0) {
  console.warn(`Found ${failures.length} timeline consistency warning(s).`);
  if (verbose || strict) console.warn(failures.slice(0, 50).join('\n'));
  if (strict) process.exitCode = 1;
}
