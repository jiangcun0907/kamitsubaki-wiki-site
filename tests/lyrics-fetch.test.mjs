import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  alignLyrics,
  buildSearchVariants,
  isReliableAlignment,
  parseLrc,
  rankTrackCandidates,
  stripFeatSuffix,
} from '../scripts/lyrics-timestamp-utils.mjs';
import {
  applyTimestampsToContent,
  validateCachedTimeline,
  validateTimestampAnchors,
} from '../scripts/apply-lyrics-timestamps.mjs';

test('streaming searches retry only after removing a trailing feat credit', () => {
  assert.equal(stripFeatSuffix('ワールド・コーリング feat.春猿火'), 'ワールド・コーリング');
  assert.equal(stripFeatSuffix('クロマティック (feat. ヰ世界情緒)'), 'クロマティック');
  assert.equal(stripFeatSuffix('Song [Live ver.]'), 'Song [Live ver.]');

  const variants = buildSearchVariants(['クロマティック (feat. ヰ世界情緒)'], ['少女革命計画']);
  assert.deepEqual(variants.map(({ title, featFallback }) => ({ title, featFallback })), [
    { title: 'クロマティック (feat. ヰ世界情緒)', featFallback: false },
    { title: 'クロマティック', featFallback: true },
  ]);
});

test('candidate ranking requires title, artist, and compatible duration', () => {
  const target = { title: 'いろはに咲きて', artist: 'ヰ世界情緒', duration: 223 };
  const ranked = rankTrackCandidates([
    { title: 'いろはに咲きて', artist: 'ヰ世界情緒', duration: 222, id: 'correct' },
    { title: 'いろはに咲きて', artist: '別の歌手', duration: 222, id: 'artist-mismatch' },
    { title: 'いろはに咲きて', artist: 'ヰ世界情緒', duration: 310, id: 'duration-mismatch' },
  ], target);

  assert.deepEqual(ranked.map(({ candidate }) => candidate.id), ['correct']);
});

test('LRC parsing and ordered lyric alignment reject unrelated results', () => {
  const rows = parseLrc('[00:01.20]愛した理由も\n[00:03.345]肌の色すら\n[00:06.00]夢や希望は\n[00:08.00]過去が僕らを');
  assert.deepEqual(rows.map(({ time }) => time), ['00:01.20', '00:03.345', '00:06.00', '00:08.00']);

  const aligned = alignLyrics(['愛した理由も', '肌の色すら', '夢や希望は', '過去が僕らを'], rows);
  assert.equal(aligned.coverage, 1);
  assert.equal(isReliableAlignment(aligned), true);

  const unrelated = alignLyrics(['まったく', '別の', '歌詞です', '一致しない'], rows);
  assert.equal(isReliableAlignment(unrelated), false);
});

test('fetcher declares all requested providers and alignment checks', async () => {
  const source = await readFile(new URL('../scripts/fetch-lyrics-timestamps.mjs', import.meta.url), 'utf8');
  for (const provider of ['lrclib', 'netease', 'qqmusic', 'kugou']) {
    assert.match(source, new RegExp(`['"]${provider}['"]`));
  }
  assert.match(source, /buildSearchVariants/);
  assert.match(source, /isReliableAlignment/);
  assert.match(source, /cacheIsReliable/);
});

test('timestamp application validates alignment and fills all localized lyric containers', async () => {
  const source = await readFile(new URL('../scripts/apply-lyrics-timestamps.mjs', import.meta.url), 'utf8');
  assert.match(source, /isReliableAlignment/);
  assert.match(source, /process\.argv\.includes\('--dry-run'\)/);
  assert.match(source, /\['cn-lyric', 'en-lyric', 'trans-lyric'\]/);
  assert.match(source, /if \(TIMESTAMP_PATTERN\.test\(jpContent\)\) return block/);
});

test('timestamp application rejects a cache timeline that conflicts with existing anchors', () => {
  const alignment = alignLyrics(
    ['第一行', '第二行', '第三行', '第四行'],
    parseLrc('[00:01.00]第一行\n[00:03.00]第二行\n[00:05.00]第三行\n[00:07.00]第四行'),
  );
  assert.equal(validateTimestampAnchors([
    { text: '第一行', timestamp: '00:01.20' },
    { text: '第二行', timestamp: null },
    { text: '第三行', timestamp: '00:05.10' },
    { text: '第四行', timestamp: null },
  ], alignment).compatible, true);
  assert.equal(validateTimestampAnchors([
    { text: '第一行', timestamp: '00:11.00' },
    { text: '第二行', timestamp: null },
    { text: '第三行', timestamp: null },
    { text: '第四行', timestamp: null },
  ], alignment).compatible, false);
});

test('timestamp application preserves existing tags and fills compatible gaps', () => {
  const content = `<div class="my-lyric-box">
<div class="lyric-line">
<div class="jp-lyric">[00:01.00]第一行</div>
<div class="cn-lyric">[00:01.00]第一行翻译</div>
</div>
<div class="lyric-line">
<div class="jp-lyric">第二行</div>
<div class="cn-lyric">第二行翻译</div>
</div>
<div class="lyric-line">
<div class="jp-lyric">第三行</div>
<div class="cn-lyric">第三行翻译</div>
</div>
<div class="lyric-line">
<div class="jp-lyric">[00:07.00]第四行</div>
<div class="cn-lyric">[00:07.00]第四行翻译</div>
</div>
</div>`;
  const rows = parseLrc('[00:01.00]第一行\n[00:03.00]第二行\n[00:05.00]第三行\n[00:07.00]第四行');
  const result = applyTimestampsToContent(content, rows);
  assert.equal(result.modifiedLines, 2);
  assert.match(result.content, /<div class="jp-lyric">\[00:03\.00\]第二行/);
  assert.match(result.content, /<div class="cn-lyric">\[00:05\.00\]第三行翻译/);
  assert.equal((result.content.match(/\[00:01\.00\]/gu) || []).length, 2);
});

test('timestamp import rejects decreasing and duration-overflow timelines', () => {
  assert.equal(validateCachedTimeline([
    { time: '00:10.00' },
    { time: '00:09.00' },
  ], 120), false);
  assert.equal(validateCachedTimeline([
    { time: '02:11.00' },
  ], 120), false);
  assert.equal(validateCachedTimeline([
    { time: '00:10.00' },
    { time: '01:59.00' },
  ], 120), true);
});

test('CI runs the strict synchronized-lyrics audit', async () => {
  const workflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(workflow, /pnpm lyrics:timestamps:audit -- --strict/);
});
