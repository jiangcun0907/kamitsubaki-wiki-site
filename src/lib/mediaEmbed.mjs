const PROVIDER_ALIASES = new Map([
  ['youtube', 'youtube'],
  ['youtu.be', 'youtube'],
  ['yt', 'youtube'],
  ['bilibili', 'bilibili'],
  ['bili', 'bilibili'],
  ['apple-music', 'apple-music'],
  ['applemusic', 'apple-music'],
  ['apple music', 'apple-music'],
  ['spotify', 'spotify'],
  ['netease', 'netease'],
  ['netease-music', 'netease'],
  ['163', 'netease'],
  ['网易云音乐', 'netease'],
  ['qq-music', 'qq-music'],
  ['qqmusic', 'qq-music'],
  ['qq music', 'qq-music'],
  ['qq音乐', 'qq-music'],
]);

const PROVIDER_LABELS = {
  youtube: 'YouTube',
  bilibili: 'bilibili',
  'apple-music': 'Apple Music',
  spotify: 'Spotify',
  netease: '网易云音乐',
  'qq-music': 'QQ 音乐',
};

const VIDEO_ALLOW = 'encrypted-media; picture-in-picture; fullscreen';
const AUDIO_ALLOW = 'encrypted-media; fullscreen';
const SAFE_ID = /^[A-Za-z0-9_-]+$/;
const BILIBILI_BVID = /^BV[A-Za-z0-9]+$/i;
const MEDIA_SWITCHER_OPEN = /^\{\{media-switcher::(.+)\}\}$/i;
const MEDIA_SWITCHER_CLOSE = /^\{\{\/media-switcher\}\}$/i;
const MAX_MEDIA_SWITCHER_ITEMS = 6;

function safeUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function cleanTarget(value) {
  return String(value || '').trim().replace(/^<|>$/g, '');
}

function isAllowedHostname(hostname, allowedDomain) {
  const normalized = hostname.replace(/^www\./, '').toLowerCase();
  return normalized === allowedDomain || normalized.endsWith(`.${allowedDomain}`);
}

function youtube(target) {
  const value = cleanTarget(target);
  const url = safeUrl(value);
  let id = value;

  if (url) {
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
    if (hostname === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0];
    else if (isAllowedHostname(hostname, 'youtube.com')) {
      id = url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1];
    } else return null;
  }

  if (!id || !SAFE_ID.test(id)) return null;
  return {
    src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`,
    kind: 'video',
    allow: VIDEO_ALLOW,
  };
}

function bilibili(target) {
  const value = cleanTarget(target);
  const url = safeUrl(value);
  if (url && !isAllowedHostname(url.hostname, 'bilibili.com') && url.hostname.toLowerCase() !== 'b23.tv') return null;
  const pathId = url?.pathname.match(/\/(BV[A-Za-z0-9]+|av\d+)/i)?.[1];
  const id = pathId || url?.searchParams.get('bvid') || url?.searchParams.get('aid') || value;

  let idParam;
  if (BILIBILI_BVID.test(id)) idParam = `bvid=${encodeURIComponent(id)}`;
  else if (/^(?:av)?\d+$/i.test(id)) idParam = `aid=${encodeURIComponent(id.replace(/^av/i, ''))}`;
  else return null;

  const page = url?.searchParams.get('p');
  const pageParam = page && /^\d+$/.test(page) ? `&p=${page}` : '&p=1';
  return {
    src: `https://player.bilibili.com/player.html?${idParam}${pageParam}&autoplay=0&danmaku=0`,
    kind: 'video',
    allow: VIDEO_ALLOW,
  };
}

function appleMusic(target) {
  const value = cleanTarget(target);
  const url = safeUrl(value);
  if (!url) return null;

  const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
  if (hostname !== 'music.apple.com' && hostname !== 'embed.music.apple.com') return null;
  url.protocol = 'https:';
  url.hostname = 'embed.music.apple.com';
  url.searchParams.delete('app');
  url.searchParams.delete('at');
  url.searchParams.delete('ct');

  const kind = url.pathname.match(/\/(song|album|playlist|music-video)\//)?.[1];
  return {
    src: url.toString(),
    kind: kind === 'music-video' ? 'video' : 'audio',
    height: kind === 'song' ? 175 : 450,
    allow: AUDIO_ALLOW,
    sandbox: 'allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation',
  };
}

function spotify(target) {
  const value = cleanTarget(target);
  const uriMatch = value.match(/^spotify:(track|album|artist|playlist|episode|show):([A-Za-z0-9]+)$/i);
  let type = uriMatch?.[1]?.toLowerCase();
  let id = uriMatch?.[2];

  if (!id) {
    const url = safeUrl(value);
    if (url?.hostname.replace(/^www\./, '').toLowerCase() !== 'open.spotify.com') return null;
    const parts = url.pathname.split('/').filter(Boolean).filter((part) => !part.startsWith('intl-'));
    [type, id] = parts;
  }

  if (!['track', 'album', 'artist', 'playlist', 'episode', 'show'].includes(type) || !id || !SAFE_ID.test(id)) return null;
  return {
    src: `https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}?utm_source=generator`,
    kind: 'audio',
    height: type === 'track' || type === 'episode' ? 152 : 352,
    allow: AUDIO_ALLOW,
  };
}

function netease(target) {
  const value = cleanTarget(target);
  const url = safeUrl(value);
  if (url && !isAllowedHostname(url.hostname, 'music.163.com')) return null;
  const id = url?.searchParams.get('id') || value.match(/(?:song|album|playlist)\/(\d+)/)?.[1] || value;
  if (!/^\d+$/.test(id)) return null;

  const pathname = url?.pathname || '';
  const type = pathname.includes('/album') ? 1 : pathname.includes('/playlist') ? 0 : 2;
  return {
    src: `https://music.163.com/outchain/player?type=${type}&id=${id}&auto=0&height=66`,
    kind: 'audio',
    height: type === 2 ? 86 : 430,
    allow: AUDIO_ALLOW,
  };
}

function qqMusic(target) {
  const value = cleanTarget(target);
  const url = safeUrl(value);
  if (url && !isAllowedHostname(url.hostname, 'y.qq.com')) return null;
  const pathId = url?.pathname.match(/\/(?:songDetail|song)\/([A-Za-z0-9]+)/i)?.[1];
  const id = url?.searchParams.get('songmid') || url?.searchParams.get('songid') || pathId || value;
  if (!id || !SAFE_ID.test(id)) return null;

  return {
    src: `https://i.y.qq.com/n2/m/outchain/player/index.html?songid=${encodeURIComponent(id)}&songtype=0`,
    kind: 'audio',
    height: 86,
    allow: AUDIO_ALLOW,
  };
}

const PROVIDER_BUILDERS = {
  youtube,
  bilibili,
  'apple-music': appleMusic,
  spotify,
  netease,
  'qq-music': qqMusic,
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function resolveMediaEmbed(providerName, target) {
  const provider = PROVIDER_ALIASES.get(String(providerName || '').trim().toLowerCase());
  const resolved = provider && PROVIDER_BUILDERS[provider]?.(target);
  return resolved ? { provider, label: PROVIDER_LABELS[provider], ...resolved } : null;
}

export function renderMediaEmbed(providerName, target, caption = '') {
  const media = resolveMediaEmbed(providerName, target);
  if (!media) return null;

  const title = String(caption || '').trim();
  const iframeTitle = title || `${media.label} media player`;
  const sandbox = media.sandbox ? ` sandbox="${escapeHtml(media.sandbox)}"` : '';
  const height = media.height ? ` style="--wiki-embed-height:${media.height}px"` : '';
  const figcaption = title
    ? `<figcaption class="wiki-embed__caption"><span>${escapeHtml(media.label)}</span>${escapeHtml(title)}</figcaption>`
    : `<figcaption class="wiki-embed__caption wiki-embed__caption--provider">${escapeHtml(media.label)}</figcaption>`;

  return `<figure class="wiki-embed wiki-embed--${media.kind} wiki-embed--${media.provider}" data-media-provider="${media.provider}"${height}><div class="wiki-embed__frame"><iframe src="${escapeHtml(media.src)}" title="${escapeHtml(iframeTitle)}" loading="lazy" allow="${escapeHtml(media.allow)}" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen${sandbox}></iframe></div>${figcaption}</figure>`;
}

function renderMediaPlaceholder(providerName, target, caption = '') {
  const media = resolveMediaEmbed(providerName, target);
  if (!media) return null;

  return `<wiki-media-embed data-provider="${escapeHtml(media.provider)}" data-target="${escapeHtml(cleanTarget(target))}" data-caption="${escapeHtml(String(caption || '').trim())}"></wiki-media-embed>`;
}

function mediaEmbedNode(media) {
  const title = String(media.caption || '').trim();
  const iframeTitle = title || `${media.label} media player`;
  const figureClasses = ['wiki-embed', `wiki-embed--${media.kind}`, `wiki-embed--${media.provider}`];
  const figureProperties = {
    className: figureClasses,
    dataMediaProvider: media.provider,
  };

  if (media.height) figureProperties.style = `--wiki-embed-height:${media.height}px`;

  const iframeProperties = {
    src: media.src,
    title: iframeTitle,
    loading: 'lazy',
    allow: media.allow,
    referrerPolicy: 'strict-origin-when-cross-origin',
    allowFullScreen: true,
  };

  if (media.sandbox) iframeProperties.sandbox = media.sandbox.split(' ');

  return {
    type: 'element',
    tagName: 'figure',
    properties: figureProperties,
    children: [
      {
        type: 'element',
        tagName: 'div',
        properties: { className: ['wiki-embed__frame'] },
        children: [{ type: 'element', tagName: 'iframe', properties: iframeProperties, children: [] }],
      },
      {
        type: 'element',
        tagName: 'figcaption',
        properties: {
          className: title
            ? ['wiki-embed__caption']
            : ['wiki-embed__caption', 'wiki-embed__caption--provider'],
        },
        children: title
          ? [
              { type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: media.label }] },
              { type: 'text', value: title },
            ]
          : [{ type: 'text', value: media.label }],
      },
    ],
  };
}

function mediaFromPlaceholder(node) {
  if (node?.type !== 'element' || node.tagName !== 'wiki-media-embed') return null;
  const provider = node.properties?.dataProvider;
  const target = node.properties?.dataTarget;
  const caption = node.properties?.dataCaption || '';
  const media = resolveMediaEmbed(provider, target);
  return media ? { ...media, caption } : null;
}

function mediaSwitcherNode(node, state) {
  const children = (node.children || []).filter(
    (child) => child?.type !== 'text' || String(child.value || '').trim(),
  );
  const mediaItems = children.map(mediaFromPlaceholder);
  if (mediaItems.some((media) => !media)) return null;
  if (mediaItems.length < 2 || mediaItems.length > MAX_MEDIA_SWITCHER_ITEMS) return null;
  if (new Set(mediaItems.map((media) => media.provider)).size !== mediaItems.length) return null;

  const label = String(node.properties?.dataLabel || '').trim();
  if (!label) return null;

  const switcherIndex = state.switcherIndex;
  state.switcherIndex += 1;
  const baseId = `wiki-media-switcher-${switcherIndex}`;

  const tabs = mediaItems.map((media, index) => {
    const selected = index === 0;
    return {
      type: 'element',
      tagName: 'button',
      properties: {
        type: 'button',
        role: 'tab',
        id: `${baseId}-tab-${index}`,
        className: ['wiki-media-switcher__tab'],
        dataMediaSwitcherTab: '',
        dataMediaProvider: media.provider,
        ariaControls: `${baseId}-panel-${index}`,
        ariaSelected: String(selected),
        tabIndex: selected ? 0 : -1,
      },
      children: [{ type: 'text', value: media.label }],
    };
  });

  const panels = mediaItems.map((media, index) => ({
    type: 'element',
    tagName: 'div',
    properties: {
      role: 'tabpanel',
      id: `${baseId}-panel-${index}`,
      className: index === 0
        ? ['wiki-media-switcher__panel', 'is-active']
        : ['wiki-media-switcher__panel'],
      dataMediaSwitcherPanel: '',
      ariaLabelledBy: `${baseId}-tab-${index}`,
      tabIndex: 0,
    },
    children: [mediaEmbedNode(media)],
  }));

  return {
    type: 'element',
    tagName: 'section',
    properties: {
      className: ['wiki-media-switcher'],
      dataMediaSwitcher: '',
      ariaLabel: label,
    },
    children: [
      {
        type: 'element',
        tagName: 'div',
        properties: { className: ['wiki-media-switcher__header'] },
        children: [
          {
            type: 'element',
            tagName: 'p',
            properties: { className: ['wiki-media-switcher__title'] },
            children: [{ type: 'text', value: label }],
          },
          {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['wiki-media-switcher__tabs'],
              role: 'tablist',
              ariaLabel: label,
            },
            children: tabs,
          },
        ],
      },
      {
        type: 'element',
        tagName: 'div',
        properties: { className: ['wiki-media-switcher__panels'] },
        children: panels,
      },
    ],
  };
}

function materializeMediaPlaceholders(node, state) {
  if (!node?.children) return;

  node.children = node.children.flatMap((child) => {
    if (child?.type === 'element' && child.tagName === 'wiki-media-switcher') {
      const switcher = mediaSwitcherNode(child, state);
      return switcher ? [switcher] : [];
    }

    const media = mediaFromPlaceholder(child);
    if (media) {
      return [mediaEmbedNode(media)];
    }

    materializeMediaPlaceholders(child, state);
    return [child];
  });
}

export function rehypeMaterializeMediaEmbeds() {
  return (tree) => materializeMediaPlaceholders(tree, { switcherIndex: 0 });
}

function shortcodeFromLink(node) {
  if (node?.type !== 'link') return null;
  const provider = (node.children || [])
    .filter((child) => child.type === 'text' || child.type === 'inlineCode')
    .map((child) => child.value)
    .join('');
  return provider ? { provider, target: node.url, caption: node.title || '' } : null;
}

function shortcodeFromParagraph(node) {
  if (node.type !== 'paragraph') return null;
  const children = node.children || [];

  if (children.length === 2 && children[0].type === 'text' && children[0].value.trim() === '@') {
    return shortcodeFromLink(children[1]);
  }

  if (children.length === 1 && children[0].type === 'text') {
    const match = children[0].value.match(/^@\[([^\]]+)\]\((\S+?)(?:\s+["']([^"']*)["'])?\)$/);
    if (match) return { provider: match[1], target: match[2], caption: match[3] || '' };
  }

  return null;
}

function paragraphText(node) {
  if (node?.type !== 'paragraph' || node.children?.length !== 1 || node.children[0].type !== 'text') return null;
  return node.children[0].value.trim();
}

function shortcodeSource(shortcode) {
  const caption = shortcode.caption ? ` "${String(shortcode.caption).replaceAll('"', '\\"')}"` : '';
  return `@[${shortcode.provider}](${shortcode.target}${caption})`;
}

function inertMediaSwitcherBlock(nodes) {
  const source = nodes
    .map((node) => {
      const text = paragraphText(node);
      if (text) return text;
      const shortcode = shortcodeFromParagraph(node);
      return shortcode ? shortcodeSource(shortcode) : '';
    })
    .filter(Boolean)
    .join('\n');

  return { type: 'paragraph', children: [{ type: 'text', value: source }] };
}

function renderMediaSwitcherPlaceholder(label, shortcodes) {
  const embeds = shortcodes.map(({ provider, target, caption }) => renderMediaPlaceholder(provider, target, caption));
  if (embeds.some((embed) => !embed)) return null;
  return `<wiki-media-switcher data-label="${escapeHtml(label)}">${embeds.join('')}</wiki-media-switcher>`;
}

function validatedMediaSwitcherPlaceholder(label, shortcodes) {
  const resolved = shortcodes.map((shortcode) => shortcode && resolveMediaEmbed(shortcode.provider, shortcode.target));
  const providerNames = resolved.filter(Boolean).map((media) => media.provider);
  const valid = Boolean(label)
    && shortcodes.length >= 2
    && shortcodes.length <= MAX_MEDIA_SWITCHER_ITEMS
    && shortcodes.every(Boolean)
    && resolved.every(Boolean)
    && new Set(providerNames).size === providerNames.length;

  return valid ? renderMediaSwitcherPlaceholder(label, shortcodes) : null;
}

function compactMediaSwitcherFromParagraph(node) {
  if (node?.type !== 'paragraph') return null;
  const children = node.children || [];
  if (children.length < 5 || children[0]?.type !== 'text') return null;

  const opening = children[0].value.match(/^\s*\{\{media-switcher::(.+?)\}\}\s*@\s*$/i);
  if (!opening) return null;

  const shortcodes = [];
  for (let index = 1; index < children.length; index += 2) {
    const shortcode = shortcodeFromLink(children[index]);
    const separator = children[index + 1];
    if (!shortcode || separator?.type !== 'text') return null;
    shortcodes.push(shortcode);

    const isLastSeparator = index + 1 === children.length - 1;
    if (isLastSeparator) {
      if (!/^\s*\{\{\/media-switcher\}\}\s*$/i.test(separator.value)) return null;
      return { label: opening[1].trim(), shortcodes };
    }

    if (!/^\s*@\s*$/.test(separator.value)) return null;
  }

  return null;
}

function transformMediaSwitcherBlocks(node) {
  if (!node?.children) return;

  const transformed = [];
  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    const compact = compactMediaSwitcherFromParagraph(child);
    if (compact) {
      const placeholder = validatedMediaSwitcherPlaceholder(compact.label, compact.shortcodes);
      transformed.push(placeholder ? { type: 'html', value: placeholder } : child);
      continue;
    }

    const opening = paragraphText(child)?.match(MEDIA_SWITCHER_OPEN);

    if (!opening) {
      transformMediaSwitcherBlocks(child);
      transformed.push(child);
      continue;
    }

    let closingIndex = index + 1;
    while (closingIndex < node.children.length && !MEDIA_SWITCHER_CLOSE.test(paragraphText(node.children[closingIndex]) || '')) {
      closingIndex += 1;
    }

    if (closingIndex >= node.children.length) {
      transformed.push(child);
      continue;
    }

    const label = opening[1].trim();
    const contents = node.children.slice(index + 1, closingIndex);
    const shortcodes = contents.map(shortcodeFromParagraph);
    const placeholder = validatedMediaSwitcherPlaceholder(label, shortcodes);
    if (placeholder) {
      transformed.push({ type: 'html', value: placeholder });
    } else {
      transformed.push(inertMediaSwitcherBlock(node.children.slice(index, closingIndex + 1)));
    }
    index = closingIndex;
  }

  node.children = transformed;
}

function mediaStackFromTableCell(node) {
  if (node.type !== 'tableCell') return null;

  const shortcodes = [];
  let expectsLink = false;

  for (const child of node.children || []) {
    if (child.type === 'text') {
      const marker = child.value.replace(/\s/g, '');
      if (!marker) continue;
      if (marker === '@' && !expectsLink) {
        expectsLink = true;
        continue;
      }
      return null;
    }

    if (child.type === 'link' && expectsLink) {
      const shortcode = shortcodeFromLink(child);
      if (!shortcode) return null;
      shortcodes.push(shortcode);
      expectsLink = false;
      continue;
    }

    return null;
  }

  if (expectsLink || shortcodes.length === 0) return null;
  const embeds = shortcodes.map(({ provider, target, caption }) => renderMediaPlaceholder(provider, target, caption));
  if (embeds.some((embed) => !embed)) return null;
  return `<div class="wiki-embed-stack" data-media-embed-stack>${embeds.join('')}</div>`;
}

function transformShortcodes(node) {
  if (!node?.children) return;

  node.children = node.children.map((child) => {
    const stack = mediaStackFromTableCell(child);
    if (stack) {
      child.children = [{ type: 'html', value: stack }];
      return child;
    }

    const shortcode = shortcodeFromParagraph(child);
    const html = shortcode && renderMediaPlaceholder(shortcode.provider, shortcode.target, shortcode.caption);
    if (html) return { type: 'html', value: html };
    transformShortcodes(child);
    return child;
  });
}

export default function remarkMediaEmbed() {
  return (tree) => {
    transformMediaSwitcherBlocks(tree);
    transformShortcodes(tree);
  };
}
