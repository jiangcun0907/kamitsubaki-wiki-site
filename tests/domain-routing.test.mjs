import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Cloudflare Pages redirects production domains to canonical locale paths', async () => {
  const redirects = await readFile(new URL('../public/_redirects', import.meta.url), 'utf8');

  assert.match(redirects, /^https:\/\/kamitsubaki\.wiki\/\s+https:\/\/kamitsubaki\.wiki\/zh\/\s+302!$/m);
  assert.match(redirects, /^https:\/\/zh\.kamitsubaki\.wiki\/\*\s+https:\/\/kamitsubaki\.wiki\/zh\/:splat\s+302!$/m);
  assert.match(redirects, /^https:\/\/en\.kamitsubaki\.wiki\/\*\s+https:\/\/kamitsubaki\.wiki\/en\/:splat\s+302!$/m);
  assert.match(redirects, /^https:\/\/ja\.kamitsubaki\.wiki\/\*\s+https:\/\/kamitsubaki\.wiki\/ja\/:splat\s+302!$/m);
});

test('legacy SINSAEKAI project routes redirect to the corrected slug', async () => {
  const redirects = await readFile(new URL('../public/_redirects', import.meta.url), 'utf8');

  for (const locale of ['zh', 'ja', 'en']) {
    assert.match(
      redirects,
      new RegExp(`^/${locale}/projects/labels/sinsaekai-studio\\s+/${locale}/projects/labels/sinsekai-studio\\s+301$`, 'm'),
    );
  }
});

test('legacy song catalog routes redirect to the folder-driven structure', async () => {
  const redirects = await readFile(new URL('../public/_redirects', import.meta.url), 'utf8');

  for (const locale of ['zh', 'ja', 'en']) {
    assert.match(
      redirects,
      new RegExp(`^/${locale}/songs/kaf-originals/shi\\s+/${locale}/songs/kaf/originals/shi\\s+301$`, 'm'),
    );
  }
});
