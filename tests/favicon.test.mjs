import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the conventional favicon route has a valid multi-size ICO asset', async () => {
  const favicon = await readFile(new URL('../public/favicon.ico', import.meta.url));

  assert.deepEqual([...favicon.subarray(0, 4)], [0, 0, 1, 0]);
  assert.equal(favicon.readUInt16LE(4), 3);
  assert.deepEqual(
    [0, 1, 2].map((index) => [favicon[6 + (16 * index)], favicon[7 + (16 * index)]]),
    [[16, 16], [32, 32], [48, 48]],
  );
});
