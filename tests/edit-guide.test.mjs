import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

async function fileExists(path) {
  try {
    await access(new URL(path, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('edit source links route through the local contributor guide first', async () => {
  const artistPage = await readSource('../src/pages/[locale]/artists/[...id].astro');
  const articleHeader = await readSource('../src/components/WikiArticleHeader.astro');

  assert.match(artistPage, /\/contribute\/edit\?target=/);
  assert.match(artistPage, /encodeURIComponent\(contentSourcePath\)/);
  assert.match(artistPage, /src\/content\/artists\/\$\{id\}\/\$\{localeCode\}\.md/);
  assert.doesNotMatch(articleHeader, /target="_blank"/);
});

test('localized contributor guide renders a tiered, progress-aware learning journey and final edit link', async () => {
  assert.equal(await fileExists('../src/pages/[locale]/contribute/edit.astro'), true);

  const guidePage = await readSource('../src/pages/[locale]/contribute/edit.astro');

  assert.match(guidePage, /getStaticPaths/);
  assert.match(guidePage, /data-guide-step/);
  assert.match(guidePage, /data-step-complete/);
  assert.match(guidePage, /localStorage/);
  assert.match(guidePage, /data-guide-progress-fill/);
  assert.match(guidePage, /guide-progress-card/);
  assert.doesNotMatch(guidePage, /guide-progress-bar sticky/);
  assert.match(guidePage, /data-ai-prompt/);
  assert.match(guidePage, /data-ai-context/);
  assert.match(guidePage, /renderAiPrompt/);
  assert.match(guidePage, /navigator\.clipboard\.writeText/);
  assert.match(guidePage, /data-github-edit-link/);
  assert.match(guidePage, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(guidePage, /normalizeTarget/);
  assert.match(guidePage, /data-repo-edit-root/);
  assert.match(guidePage, /data-content-path-prefix/);
  assert.match(guidePage, /repoEditRoot/);
  assert.match(guidePage, /renderMarkdownFragment/);
  assert.match(guidePage, /set:html=\{section\.bodyHtml\}/);
  assert.match(guidePage, /renderedVariants\.map/);
  assert.match(guidePage, /data-default-guide-mode="beginner"/);
  assert.match(guidePage, /data-guide-mode-button/);
  assert.match(guidePage, /data-guide-mode-panel/);
  assert.match(guidePage, /data-guide-rail/);
  assert.match(guidePage, /availableModes/);
  assert.match(guidePage, /searchParams\.get\('mode'\)/);
  assert.match(guidePage, /history\.replaceState/);
  assert.match(guidePage, /data-guide-target-path/);
  assert.match(guidePage, /getCollection\('syntaxGuide'\)/);
  assert.match(guidePage, /renderContentEntry\(syntaxEntry\)/);
  assert.match(guidePage, /id="syntax-reference"/);
  assert.match(guidePage, /<Fragment set:html=\{syntaxHtml\} \/>/);
  assert.match(guidePage, /<TableOfContents headings=\{syntaxHeadings\}/);
  assert.match(guidePage, /href="#choose-guide"/);
  assert.match(guidePage, /href="#syntax-reference"/);
});

test('contributor guide copy lives in editable content files', async () => {
  for (const locale of ['zh', 'ja', 'en']) {
    assert.equal(await fileExists(`../src/content/contribute/edit-guide/${locale}.md`), true);
  }

  const contentConfig = await readSource('../src/content.config.ts');
  const guidePage = await readSource('../src/pages/[locale]/contribute/edit.astro');
  const zhGuide = await readSource('../src/content/contribute/edit-guide/zh.md');

  assert.match(contentConfig, /editGuide/);
  assert.match(guidePage, /getCollection\('editGuide'\)/);
  assert.doesNotMatch(guidePage, /const copy = \{/);
  assert.doesNotMatch(guidePage, /编辑前快速学习/);
  assert.doesNotMatch(guidePage, /Quick guide before editing/);
  assert.match(contentConfig, /switchLabel: z\.string\(\)/);
  assert.match(contentConfig, /variants: z\.array/);
  assert.match(zhGuide, /key: beginner/);
  assert.match(zhGuide, /key: web/);
  assert.match(zhGuide, /key: new-entry/);
  assert.match(zhGuide, /key: experienced/);
  assert.match(zhGuide, /注册免费的 GitHub 个人账号/);
  assert.match(zhGuide, /创建你的第一个 Pull Request/);
  assert.match(zhGuide, /创建目录与三语文件/);
  assert.match(zhGuide, /aiPrompt:/);
  assert.match(zhGuide, /\{\{TARGET_PATH\}\}/);
  assert.match(zhGuide, /```yaml/);
  assert.match(zhGuide, /> /);
});

test('contribution documentation presents one connected learning path in every locale', async () => {
  const syntaxPage = await readSource('../src/pages/[locale]/contribute/syntax.astro');

  assert.match(syntaxPage, /contribute\/edit#syntax-reference/);
  assert.match(syntaxPage, /renderContentEntry\(entry\)/);
  assert.match(syntaxPage, /const hasArticleBody = Boolean\(articleBody\)/);
  assert.doesNotMatch(syntaxPage, /Boolean\(entry\.body\?\.trim\(\)\)/);

  for (const locale of ['zh', 'ja', 'en']) {
    const syntaxGuide = await readSource(`../src/content/contribute/syntax-guide/${locale}.md`);
    assert.match(syntaxGuide, /src\/content\//);
    assert.match(syntaxGuide, /translationKey/);
    assert.match(syntaxGuide, /Preview \/ Changes/);
    assert.match(syntaxGuide, /@\[.+\]\(/s);
  }

  const contributorDocs = [
    await readSource('../docs/contributing.md'),
    await readSource('../docs/contributing.ja.md'),
    await readSource('../docs/contributing.en.md'),
  ];

  for (const document of contributorDocs) {
    assert.match(document, /kamitsubaki\.wiki\/(?:zh|ja|en)\/contribute\/edit/);
  }
});

test('syntax tutorials pair highlighted source blocks with rendered examples and end with raw HTML', async () => {
  const expectations = {
    zh: {
      result: /显示效果|显示实例|实际作用|显示结果/,
      finalHeading: '## 高级用法：保留的 HTML 语法',
      syncHeading: '### 逐字歌词时间轴',
      lyricSteps: ['#### 代码语法', '#### 写法', '#### 实例'],
      aiSteps: ['#### 提示词语法', '#### 写法', '#### 输出实例'],
    },
    ja: {
      result: /表示例|表示結果|結果/,
      finalHeading: '## 高度な使い方：対応する生 HTML',
      syncHeading: '### 同期歌詞のタイムライン',
      lyricSteps: ['#### コード構文', '#### 書き方', '#### 実例'],
      aiSteps: ['#### プロンプト構文', '#### 書き方', '#### 出力例'],
    },
    en: {
      result: /Rendered result|Rendered example|Result:/,
      finalHeading: '## Advanced: supported raw HTML',
      syncHeading: '### Synchronized lyric timeline',
      lyricSteps: ['#### Code syntax', '#### Authoring', '#### Example'],
      aiSteps: ['#### Prompt syntax', '#### Authoring', '#### Output example'],
    },
  };

  for (const [locale, expectation] of Object.entries(expectations)) {
    const guide = await readSource(`../src/content/contribute/syntax-guide/${locale}.md`);
    const headings = guide.match(/^## .+$/gm) || [];

    assert.equal(headings.at(-1), expectation.finalHeading);
    assert.match(guide, new RegExp(`^${expectation.syncHeading}$`, 'm'));
    assert.doesNotMatch(guide, /^## (?:代码与语法高亮|コードとシンタックスハイライト|Code and syntax highlighting)$/m);
    assert.match(guide, expectation.result);
    assert.match(guide, /```md\r?\n/);
    assert.match(guide, /```yaml\r?\n/);
    assert.match(guide, /```html\r?\n/);
    assert.match(guide, /<ruby>.+<rt>.+<\/rt><\/ruby>/s);
    assert.match(guide, /<details>.+<summary>.+<\/summary>.+<\/details>/s);
    for (const step of expectation.lyricSteps) assert.match(guide, new RegExp(`^${step}$`, 'm'));
    for (const step of expectation.aiSteps) assert.match(guide, new RegExp(`^${step}$`, 'm'));
    assert.match(guide, /\{\{lyrics-controls::(?:zh|ja|en)\}\}[\s\S]+class="my-lyric-box"/);
    assert.match(guide, /class="furi"[\s\S]+class="roma"/);
    assert.match(guide, /\[00:00\.00\]<ruby>[\s\S]+\[00:00\.80\]<ruby>/);
    assert.match(guide, /\[mm:ss\.xx\][\s\S]+\[mm:ss\.xxx\]/);
    assert.match(guide, /lrc-tag[\s\S]+lrc-word/);
    assert.match(guide, /Do not add lyrics|不补写歌词|歌詞の追加/);
    assert.match(guide, /Never output style|禁止 style|style、すべての on\*/);

    let insideFence = false;
    for (const line of guide.split(/\r?\n/).filter((line) => line.startsWith('```'))) {
      if (!insideFence) {
        assert.match(line, /^```(?:md|yaml|html)$/);
      } else {
        assert.equal(line, '```');
      }
      insideFence = !insideFence;
    }
    assert.equal(insideFence, false);
  }
});
