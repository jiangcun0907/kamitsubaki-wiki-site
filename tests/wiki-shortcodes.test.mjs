import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { renderMarkdownFragment } from '../src/lib/markdown.mjs';

test('renders fixed inline Wiki aliases without authored HTML', async () => {
  const rendered = await renderMarkdownFragment(`
{{ruby::糸::いと}} {{ruby::間違::まちが::machiga}}
{{spoiler::hidden}} {{mark::important}} {{abbr::V.W.P::Virtual Witch Phenomenon}}
{{kbd::Ctrl+K}} H{{sub::2}}O x{{sup::2}} {{small::note}} {{time::today::2026-07-19}}
  `);

  assert.match(rendered, /<ruby>糸<rt>いと<\/rt><\/ruby>/);
  assert.match(rendered, /<ruby>間違<rt class="furi">まちが<\/rt><rt class="roma">machiga<\/rt><\/ruby>/);
  assert.match(rendered, /<span class="wiki-spoiler" tabindex="0">hidden<\/span>/);
  assert.match(rendered, /<mark>important<\/mark>/);
  assert.match(rendered, /<abbr title="Virtual Witch Phenomenon">V\.W\.P<\/abbr>/);
  assert.match(rendered, /<kbd>Ctrl\+K<\/kbd>/);
  assert.match(rendered, /H<sub>2<\/sub>O x<sup>2<\/sup>/);
  assert.match(rendered, /<small>note<\/small>/);
  assert.match(rendered, /<time datetime="2026-07-19">today<\/time>/);
});

test('renders a details alias while preserving Markdown inside the block', async () => {
  const rendered = await renderMarkdownFragment(`
{{details::Track list}}

1. **First song**
2. Second song

{{/details}}
  `);

  assert.match(rendered, /<details><summary>Track list<\/summary>/);
  assert.match(rendered, /<ol>/);
  assert.match(rendered, /<strong>First song<\/strong>/);
  assert.match(rendered, /<\/details>/);
});

test('escapes shortcode arguments and leaves unknown or malformed calls as text', async () => {
  const rendered = await renderMarkdownFragment(`
{{abbr::A&B::letters & more}}
{{unknown::value}}
{{ruby::missing-reading}}
  `);

  assert.match(rendered, /<abbr title="letters &#x26; more">A&#x26;B<\/abbr>/);
  assert.match(rendered, /\{\{unknown::value\}\}/);
  assert.match(rendered, /\{\{ruby::missing-reading\}\}/);
});

test('does not open an unterminated details block', async () => {
  const rendered = await renderMarkdownFragment('{{details::Missing close}}\n\nBody');

  assert.doesNotMatch(rendered, /<details>/);
  assert.match(rendered, /\{\{details::Missing close\}\}/);
});

test('inline aliases remain intact inside Markdown table cells', async () => {
  const rendered = await renderMarkdownFragment(`
| Title | Reading |
| --- | --- |
| 糸 | {{ruby::糸::いと}} |
  `);

  assert.match(rendered, /<td><ruby>糸<rt>いと<\/rt><\/ruby><\/td>/);
  assert.equal((rendered.match(/<td>/g) || []).length, 2);
});

test('renders localized song lyric controls from one block alias', async () => {
  const zh = await renderMarkdownFragment('{{lyrics-controls::zh}}\n\n<div class="my-lyric-box">Lyrics</div>');
  const ja = await renderMarkdownFragment('{{lyrics-controls::ja}}\n\n<div class="my-lyric-box">歌詞</div>');

  assert.match(zh, /^<div class="my-lyric-controls">/);
  assert.equal((zh.match(/data-lyric-action=/g) || []).length, 3);
  assert.match(zh, /data-lyric-action="translation"/);
  assert.match(zh, /aria-pressed="false">隐藏注音<\/button>/);
  assert.match(zh, /<\/div>\n<div class="my-lyric-box">Lyrics<\/div>$/);
  assert.equal((ja.match(/data-lyric-action=/g) || []).length, 2);
  assert.doesNotMatch(ja, /data-lyric-action="translation"/);
});

test('keeps fenced code language highlighting enabled', async () => {
  const rendered = await renderMarkdownFragment('```js\nconst answer = 42;\n```');

  assert.match(rendered, /<pre class="shiki github-dark"/);
  assert.match(rendered, /<span class="line"><span style="color:/);
  assert.match(rendered, /const/);
});

test('long contributor guides can satisfy the reveal observer threshold', async () => {
  const interactions = await readFile(new URL('../src/scripts/siteInteractions.js', import.meta.url), 'utf8');

  assert.match(interactions, /threshold:\s*0\.01/);
});
