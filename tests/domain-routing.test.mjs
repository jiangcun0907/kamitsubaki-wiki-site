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
