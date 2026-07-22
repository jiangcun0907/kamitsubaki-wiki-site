import assert from 'node:assert/strict';
import test from 'node:test';

import { assertNoPlaceholderContent } from './helpers/content-assertions.mjs';

test('placeholder checks reject unresolved markers without matching normal prose or lyrics', () => {
  assert.doesNotThrow(() =>
    assertNoPlaceholderContent(`
The translations currently provided are AI-generated placeholders.
<ruby>未来<rt>みらい</rt></ruby><ruby>は</ruby><ruby>未定<rt>みてい</rt></ruby>
<div class="cn-lyric">未来未定</div>
`),
  );

  for (const source of ['summary: "TBD"', '待补充', 'image: "https://placehold.co/1200x800"']) {
    assert.throws(() => assertNoPlaceholderContent(source));
  }

  assert.throws(() => assertNoPlaceholderContent('<iframe src="https://example.com"></iframe>', { forbidRawIframe: true }));
});
