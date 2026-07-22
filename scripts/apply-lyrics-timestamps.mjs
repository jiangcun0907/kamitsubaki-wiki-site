/**
 * Apply validated cached LRC timestamps to localized song Markdown files.
 * Existing timestamps are preserved; missing line-start tags are filled only
 * when the cached lyric text reliably aligns with the local Japanese lyrics.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  alignLyrics,
  isReliableAlignment,
  lrcTimeToSeconds,
} from './lyrics-timestamp-utils.mjs';

const SONGS_DIR = path.join(process.cwd(), 'src/content/songs');
const CACHE_FILE = path.join(process.cwd(), 'scripts/lyrics-cache.json');
const dryRun = process.argv.includes('--dry-run');
const verbose = process.argv.includes('--verbose');
const keyFilter = process.argv.find((argument) => argument.startsWith('--key='))?.slice('--key='.length);
const TIMESTAMP_PATTERN = /\[\d{2,3}:\d{2}\.\d{2,3}\]/u;

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
    if (match) frontmatter[match[1]] = (match[2] ?? match[3] ?? match[4]).trim();
  }
  return frontmatter;
}

function parseDuration(value) {
  const match = String(value || '').match(/^(\d+):(\d{2})$/u);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

function addTimestampToContainer(block, className, timestamp) {
  const opening = new RegExp(`(<div class="${className}">(?:\\r?\\n)?)(?!\\[\\d{2,3}:\\d{2}\\.\\d{2,3}\\])`, 'u');
  return block.replace(opening, `$1[${timestamp}]`);
}

function extractJapaneseLineData(content) {
  const rows = [];
  const pattern = /<div class="jp-lyric">\r?\n?([\s\S]*?)\r?\n?<\/div>/gu;
  let match;
  while ((match = pattern.exec(String(content || '')))) {
    const timestamp = match[1].match(TIMESTAMP_PATTERN)?.[0]?.slice(1, -1) || null;
    const text = match[1]
      .replace(TIMESTAMP_PATTERN, '')
      .replace(/<rt[^>]*>[\s\S]*?<\/rt>/gu, '')
      .replace(/<[^>]+>/gu, '')
      .replace(/\s+/gu, ' ')
      .trim();
    if (text) rows.push({ text, timestamp });
  }
  return rows;
}

export function validateTimestampAnchors(lineData, alignment, toleranceSeconds = 2.5) {
  const anchors = lineData
    .map((line, index) => ({ index, time: lrcTimeToSeconds(line.timestamp) }))
    .filter(({ time }) => Number.isFinite(time));
  if (anchors.length === 0) return { compatible: true, anchors: 0, compared: 0 };

  let compared = 0;
  for (const anchor of anchors) {
    const cachedMatch = alignment.matches.get(anchor.index);
    if (!cachedMatch) continue;
    compared += 1;
    const cachedTime = lrcTimeToSeconds(cachedMatch.time);
    if (!Number.isFinite(cachedTime) || Math.abs(cachedTime - anchor.time) > toleranceSeconds) {
      return { compatible: false, anchors: anchors.length, compared };
    }
  }
  return { compatible: compared > 0, anchors: anchors.length, compared };
}

export function validateCachedTimeline(lrcRows, duration = 0) {
  let previous = -1;
  for (const row of lrcRows) {
    const seconds = lrcTimeToSeconds(row.time);
    if (!Number.isFinite(seconds) || seconds < previous) return false;
    if (duration > 0 && seconds > duration + 10) return false;
    previous = seconds;
  }
  return true;
}

function isWithinExistingAnchors(lineIndex, candidateTime, lineData) {
  const seconds = lrcTimeToSeconds(candidateTime);
  if (!Number.isFinite(seconds)) return false;

  for (let index = lineIndex - 1; index >= 0; index -= 1) {
    const previous = lrcTimeToSeconds(lineData[index]?.timestamp);
    if (Number.isFinite(previous)) {
      if (seconds < previous) return false;
      break;
    }
  }
  for (let index = lineIndex + 1; index < lineData.length; index += 1) {
    const next = lrcTimeToSeconds(lineData[index]?.timestamp);
    if (Number.isFinite(next)) return seconds <= next;
  }
  return true;
}

export function applyTimestampsToContent(content, lrcRows, duration = 0) {
  if (!validateCachedTimeline(lrcRows, duration)) {
    return {
      content,
      modified: false,
      modifiedLines: 0,
      alignment: { matches: new Map(), matched: 0, total: 0, coverage: 0, meanScore: 0 },
      anchorsCompatible: true,
      timelineCompatible: false,
    };
  }
  const lineData = extractJapaneseLineData(content);
  const localLines = lineData.map(({ text }) => text);
  const alignment = alignLyrics(localLines, lrcRows);
  if (!isReliableAlignment(alignment)) {
    return { content, modified: false, modifiedLines: 0, alignment, anchorsCompatible: true, timelineCompatible: true };
  }
  const anchorCheck = validateTimestampAnchors(lineData, alignment);
  if (!anchorCheck.compatible) {
    return { content, modified: false, modifiedLines: 0, alignment, anchorsCompatible: false, timelineCompatible: true };
  }

  const lineBlockPattern = /<div class="lyric-line">\r?\n[\s\S]*?<\/div>\r?\n<\/div>/gu;
  let localLineIndex = 0;
  let modifiedLines = 0;
  const updated = content.replace(lineBlockPattern, (block) => {
    if (!block.includes('<div class="jp-lyric">')) return block;
    const match = alignment.matches.get(localLineIndex);
    localLineIndex += 1;
    if (!match) return block;

    const jpContent = block.match(/<div class="jp-lyric">\r?\n?([\s\S]*?)\r?\n?<\/div>/u)?.[1] || '';
    if (TIMESTAMP_PATTERN.test(jpContent)) return block;
    if (!isWithinExistingAnchors(localLineIndex - 1, match.time, lineData)) return block;

    let nextBlock = addTimestampToContainer(block, 'jp-lyric', match.time);
    for (const className of ['cn-lyric', 'en-lyric', 'trans-lyric']) {
      nextBlock = addTimestampToContainer(nextBlock, className, match.time);
    }
    if (nextBlock !== block) modifiedLines += 1;
    return nextBlock;
  });

  return {
    content: updated,
    modified: updated !== content,
    modifiedLines,
    alignment,
    anchorsCompatible: true,
    timelineCompatible: true,
  };
}

async function main() {
  if (!fs.existsSync(CACHE_FILE)) throw new Error('Lyrics cache is missing. Run lyrics:timestamps:fetch first.');
  const cache = JSON.parse(await fs.promises.readFile(CACHE_FILE, 'utf8'));
  const files = await findAllMarkdownFiles(SONGS_DIR);
  const stats = {
    eligibleFiles: 0,
    modifiedFiles: 0,
    modifiedLines: 0,
    unchangedFiles: 0,
    missingCache: 0,
    rejectedAlignment: 0,
    rejectedAnchors: 0,
    rejectedTimeline: 0,
  };

  for (const filePath of files) {
    const content = await fs.promises.readFile(filePath, 'utf8');
    if (!content.includes('my-lyric-box')) continue;
    const frontmatter = parseFrontmatter(content);
    if (!frontmatter.translationKey || (keyFilter && frontmatter.translationKey !== keyFilter)) continue;
    stats.eligibleFiles += 1;

    const rows = cache[frontmatter.translationKey]?.syncedLyrics;
    if (!Array.isArray(rows) || rows.length === 0) {
      stats.missingCache += 1;
      continue;
    }

    const result = applyTimestampsToContent(content, rows, parseDuration(frontmatter.duration));
    if (!result.timelineCompatible) {
      stats.rejectedTimeline += 1;
      continue;
    }
    if (!isReliableAlignment(result.alignment)) {
      stats.rejectedAlignment += 1;
      continue;
    }
    if (!result.anchorsCompatible) {
      stats.rejectedAnchors += 1;
      continue;
    }
    if (!result.modified) {
      stats.unchangedFiles += 1;
      continue;
    }

    stats.modifiedFiles += 1;
    stats.modifiedLines += result.modifiedLines;
    const relativePath = path.relative(process.cwd(), filePath);
    if (verbose) console.log(`${dryRun ? 'would update' : 'updated'} ${relativePath} (${result.modifiedLines} lines)`);
    if (!dryRun) await fs.promises.writeFile(filePath, result.content, 'utf8');
  }

  console.log('\nResults');
  console.log(JSON.stringify({ dryRun, ...stats }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
