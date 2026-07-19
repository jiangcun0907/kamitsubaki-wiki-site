const INLINE_SHORTCODE = /\{\{([a-z][a-z-]*)(::(?:\\.|[^{}])*)\}\}/gi;
const DETAILS_OPEN = /^\{\{details::((?:\\.|[^{}])+)\}\}$/i;
const DETAILS_CLOSE = /^\{\{\/details\}\}$/i;
const LYRICS_CONTROLS = /^\{\{lyrics-controls::(zh|ja|en)\}\}$/i;

const lyricControlCopy = {
  zh: {
    ruby: ['显示注音', '隐藏注音'],
    translation: ['显示翻译', '隐藏翻译'],
    phonetic: ['切换罗马音', '切换假名注音'],
  },
  ja: {
    ruby: ['注音を表示', '注音を非表示'],
    phonetic: ['ローマ字に切り替える', 'かなルビに切り替える'],
  },
  en: {
    ruby: ['Show kana', 'Hide kana'],
    translation: ['Show translation', 'Hide translation'],
    phonetic: ['Switch to romaji', 'Switch to kana'],
  },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function splitArguments(source) {
  const values = [];
  let current = '';
  let escaped = false;

  const input = source.slice(2);
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (escaped) {
      current += character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === ':' && input[index + 1] === ':') {
      values.push(current);
      current = '';
      index += 1;
    } else {
      current += character;
    }
  }

  if (escaped) current += '\\';
  values.push(current);
  return values.map((value) => value.trim());
}

function renderInlineShortcode(name, args) {
  const safe = args.map(escapeHtml);

  if (name === 'ruby' && (safe.length === 2 || safe.length === 3) && safe.every(Boolean)) {
    if (safe.length === 3) {
      return `<ruby>${safe[0]}<rt class="furi">${safe[1]}</rt><rt class="roma">${safe[2]}</rt></ruby>`;
    }
    return `<ruby>${safe[0]}<rt>${safe[1]}</rt></ruby>`;
  }
  if (name === 'spoiler' && safe.length === 1 && safe[0]) {
    return `<span class="wiki-spoiler" tabindex="0">${safe[0]}</span>`;
  }
  if (name === 'mark' && safe.length === 1 && safe[0]) return `<mark>${safe[0]}</mark>`;
  if (name === 'abbr' && safe.length === 2 && safe.every(Boolean)) {
    return `<abbr title="${safe[1]}">${safe[0]}</abbr>`;
  }
  if (name === 'kbd' && safe.length === 1 && safe[0]) return `<kbd>${safe[0]}</kbd>`;
  if (name === 'time' && safe.length === 2 && safe.every(Boolean)) {
    return `<time datetime="${safe[1]}">${safe[0]}</time>`;
  }
  if (['small', 'sub', 'sup'].includes(name) && safe.length === 1 && safe[0]) {
    return `<${name}>${safe[0]}</${name}>`;
  }

  return null;
}

function paragraphText(node) {
  if (node?.type !== 'paragraph' || node.children?.length !== 1 || node.children[0].type !== 'text') return null;
  return node.children[0].value.trim();
}

function renderLyricControls(locale) {
  const copy = lyricControlCopy[locale];
  const buttons = [
    `<button type="button" data-lyric-action="ruby" data-show-label="${copy.ruby[0]}" data-hide-label="${copy.ruby[1]}" aria-pressed="false">${copy.ruby[1]}</button>`,
  ];

  if (copy.translation) {
    buttons.push(
      `<button type="button" data-lyric-action="translation" data-show-label="${copy.translation[0]}" data-hide-label="${copy.translation[1]}" aria-pressed="false">${copy.translation[1]}</button>`,
    );
  }

  buttons.push(
    `<button type="button" data-lyric-action="phonetic" data-primary-label="${copy.phonetic[0]}" data-alternate-label="${copy.phonetic[1]}" aria-pressed="false">${copy.phonetic[0]}</button>`,
  );
  return `<div class="my-lyric-controls">${buttons.join('')}</div>`;
}

function transformDetailsBlocks(node) {
  if (!node?.children) return;

  const transformed = [];
  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    const blockText = paragraphText(child);
    const lyricControls = blockText?.match(LYRICS_CONTROLS);
    if (lyricControls) {
      transformed.push({ type: 'html', value: renderLyricControls(lyricControls[1].toLowerCase()) });
      continue;
    }

    const opening = blockText?.match(DETAILS_OPEN);

    if (!opening) {
      transformDetailsBlocks(child);
      transformed.push(child);
      continue;
    }

    let closingIndex = index + 1;
    while (closingIndex < node.children.length && !DETAILS_CLOSE.test(paragraphText(node.children[closingIndex]) || '')) {
      closingIndex += 1;
    }

    if (closingIndex >= node.children.length) {
      transformed.push(child);
      continue;
    }

    const titleArguments = splitArguments(`::${opening[1]}`);
    const title = titleArguments[0];
    if (titleArguments.length !== 1 || !title) {
      transformed.push(child);
      continue;
    }

    const contents = node.children.slice(index + 1, closingIndex);
    contents.forEach(transformDetailsBlocks);
    transformed.push(
      { type: 'html', value: `<details><summary>${escapeHtml(title)}</summary>` },
      ...contents,
      { type: 'html', value: '</details>' },
    );
    index = closingIndex;
  }

  node.children = transformed;
}

function transformInlineShortcodes(node) {
  if (!node?.children) return;

  node.children = node.children.flatMap((child) => {
    if (child.type !== 'text') {
      transformInlineShortcodes(child);
      return [child];
    }

    const parts = [];
    let cursor = 0;
    let match;
    INLINE_SHORTCODE.lastIndex = 0;

    while ((match = INLINE_SHORTCODE.exec(child.value))) {
      const html = renderInlineShortcode(match[1].toLowerCase(), splitArguments(match[2]));
      if (!html) continue;
      if (match.index > cursor) parts.push({ type: 'text', value: child.value.slice(cursor, match.index) });
      parts.push({ type: 'html', value: html });
      cursor = match.index + match[0].length;
    }

    if (cursor === 0) return [child];
    if (cursor < child.value.length) parts.push({ type: 'text', value: child.value.slice(cursor) });
    return parts;
  });
}

export default function remarkWikiShortcodes() {
  return (tree) => {
    transformDetailsBlocks(tree);
    transformInlineShortcodes(tree);
  };
}
