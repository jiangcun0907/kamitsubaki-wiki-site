import assert from 'node:assert/strict';
import test from 'node:test';

import { renderMarkdownFragment } from '../src/lib/markdown.mjs';
import { renderMediaEmbed, resolveMediaEmbed } from '../src/lib/mediaEmbed.mjs';

test('resolves supported video providers from IDs and share URLs', () => {
  assert.equal(resolveMediaEmbed('youtube', 'https://youtu.be/3Wtx6k2vInU').src, 'https://www.youtube-nocookie.com/embed/3Wtx6k2vInU');
  assert.match(resolveMediaEmbed('bilibili', 'https://www.bilibili.com/video/BV1CJ411b7Ym?p=2').src, /bvid=BV1CJ411b7Ym&p=2/);
});

test('resolves supported audio providers to controlled embed origins', () => {
  assert.match(resolveMediaEmbed('apple-music', 'https://music.apple.com/cn/song/example/123456789').src, /^https:\/\/embed\.music\.apple\.com\//);
  assert.equal(resolveMediaEmbed('spotify', 'spotify:track:4cOdK2wGLETKBW3PvgPWqT').src, 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT?utm_source=generator');
  assert.match(resolveMediaEmbed('网易云音乐', '2637083551').src, /^https:\/\/music\.163\.com\/outchain\/player/);
  assert.match(resolveMediaEmbed('qq音乐', '001ABCDEF').src, /^https:\/\/i\.y\.qq\.com\/n2\/m\/outchain\/player/);
});

test('rejects unknown providers and malformed targets', () => {
  assert.equal(resolveMediaEmbed('unknown', 'https://example.com/embed'), null);
  assert.equal(resolveMediaEmbed('youtube', 'javascript:alert(1)'), null);
  assert.equal(resolveMediaEmbed('apple-music', 'https://example.com/song/123'), null);
  assert.equal(resolveMediaEmbed('youtube', 'https://maliciousyoutube.com/watch?v=3Wtx6k2vInU'), null);
  assert.equal(resolveMediaEmbed('bilibili', 'https://example.com/video/BV1CJ411b7Ym'), null);
  assert.equal(resolveMediaEmbed('netease', 'https://example.com/song?id=2637083551'), null);
  assert.equal(resolveMediaEmbed('qq-music', 'https://example.com/song/001ABCDEF'), null);
});

test('renders the unified accessible iframe shell', () => {
  const html = renderMediaEmbed('youtube', '3Wtx6k2vInU', 'KAF - Ito');
  assert.match(html, /class="wiki-embed wiki-embed--video wiki-embed--youtube"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /title="KAF - Ito"/);
  assert.match(html, /referrerpolicy="strict-origin-when-cross-origin"/);
  assert.doesNotMatch(html, /clipboard-write|web-share|autoplay/);
  assert.doesNotMatch(html, /javascript:/);
});

test('markdown shortcode is transformed only when it occupies a whole paragraph', async () => {
  const rendered = await renderMarkdownFragment('@[youtube](3Wtx6k2vInU "KAF - Ito")');
  assert.match(rendered, /data-media-provider="youtube"/);
  assert.match(rendered, /youtube-nocookie\.com\/embed\/3Wtx6k2vInU/);

  const inline = await renderMarkdownFragment('Listen to @[youtube](3Wtx6k2vInU) here.');
  assert.doesNotMatch(inline, /data-media-provider/);
});

test('media switcher aggregates distinct supported providers without changing individual syntax', async () => {
  const rendered = await renderMarkdownFragment(`
{{media-switcher::KAF - Ito}}

@[bilibili](BV1CJ411b7Ym "KAF - Ito")

@[youtube](3Wtx6k2vInU "KAF - Ito")

@[spotify](spotify:track:4cOdK2wGLETKBW3PvgPWqT "KAF - Ito")

{{/media-switcher}}
  `);

  assert.match(rendered, /class="wiki-media-switcher"/);
  assert.match(rendered, /aria-label="KAF - Ito"/);
  assert.equal((rendered.match(/data-media-switcher-tab/g) || []).length, 3);
  assert.equal((rendered.match(/role="tabpanel"/g) || []).length, 3);
  assert.equal((rendered.match(/<iframe /g) || []).length, 3);
  assert.match(rendered, /data-media-provider="bilibili"/);
  assert.match(rendered, /data-media-provider="youtube"/);
  assert.match(rendered, /data-media-provider="spotify"/);
  assert.match(rendered, /aria-selected="true"/);
  assert.match(rendered, /aria-selected="false"/);
});

test('media switcher accepts compact consecutive-line and single-line authoring', async () => {
  const compactLines = await renderMarkdownFragment(`
{{media-switcher::花譜 - 雛鳥}}
@[bilibili](BV1wJ411873J "花譜 - 雛鳥")
@[youtube](M1RIUrgJqWw "花譜 - 雛鳥")
@[apple-music](https://music.apple.com/jp/song/1688351155 "花譜 - 雛鳥")
@[netease](1399847994 "花譜 - 雛鳥")
{{/media-switcher}}
  `);
  const singleLine = await renderMarkdownFragment(
    '{{media-switcher::花譜 - 雛鳥}} @[bilibili](BV1wJ411873J) @[youtube](M1RIUrgJqWw) @[apple-music](https://music.apple.com/jp/song/1688351155) @[netease](1399847994) {{/media-switcher}}',
  );

  for (const rendered of [compactLines, singleLine]) {
    assert.match(rendered, /class="wiki-media-switcher"/);
    assert.equal((rendered.match(/data-media-switcher-tab/g) || []).length, 4);
    assert.ok(rendered.indexOf('data-media-provider="bilibili"') < rendered.indexOf('data-media-provider="youtube"'));
    assert.ok(rendered.indexOf('data-media-provider="youtube"') < rendered.indexOf('data-media-provider="apple-music"'));
    assert.ok(rendered.indexOf('data-media-provider="apple-music"') < rendered.indexOf('data-media-provider="netease"'));
    assert.doesNotMatch(rendered, /localhost|href="BV1wJ411873J"|href="M1RIUrgJqWw"/);
  }
});

test('media switcher rejects malformed, duplicate, or single-provider groups as inert text', async () => {
  const cases = [
    `
{{media-switcher::Unsafe}}

@[youtube](3Wtx6k2vInU)

@[unknown](https://evil.example/embed)

{{/media-switcher}}
    `,
    `
{{media-switcher::Duplicate}}

@[youtube](3Wtx6k2vInU)

@[youtube](anotherVideo)

{{/media-switcher}}
    `,
    `
{{media-switcher::Single}}

@[youtube](3Wtx6k2vInU)

{{/media-switcher}}
    `,
  ];

  for (const source of cases) {
    const rendered = await renderMarkdownFragment(source);
    assert.doesNotMatch(rendered, /wiki-media-switcher|<iframe /);
    assert.match(rendered, /media-switcher/);
  }
});

test('multiple shortcodes in a table cell render as a vertical media stack', async () => {
  const rendered = await renderMarkdownFragment(`
| Composer | Lyricist | Players |
| --- | --- | --- |
| Wiz_nicc | Wiz_nicc | @[bilibili](BV13ZZNYQEQx) @[netease](2637083551) |
  `);

  assert.match(rendered, /<td><div class="wiki-embed-stack" data-media-embed-stack(?:="")?>/);
  assert.equal((rendered.match(/data-media-provider=/g) || []).length, 2);
  assert.ok(rendered.indexOf('data-media-provider="bilibili"') < rendered.indexOf('data-media-provider="netease"'));
});

test('table cells containing other text safely remain regular markdown', async () => {
  const rendered = await renderMarkdownFragment(`
| Player |
| --- |
| Note: @[bilibili](BV13ZZNYQEQx) |
  `);

  assert.doesNotMatch(rendered, /data-media-embed-stack/);
  assert.match(rendered, /Note:/);
});
