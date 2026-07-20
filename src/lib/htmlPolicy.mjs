import { defaultSchema } from 'rehype-sanitize';

const allowedDivClasses = [
  'wiki-fact-grid',
  'wiki-fact-card',
  'wiki-fact-card__label',
  'wiki-fact-card__value',
  'wiki-embed-stack',
  'my-lyric-controls',
  'my-lyric-box',
  'lyric-line',
  'jp-lyric',
  'cn-lyric',
  'trans-lyric',
];

export const wikiHtmlSchema = {
  ...defaultSchema,
  clobberPrefix: 'wiki-content-',
  tagNames: [
    ...defaultSchema.tagNames,
    'abbr',
    'button',
    'cite',
    'figcaption',
    'figure',
    'mark',
    'small',
    'time',
    'u',
    'wiki-media-embed',
    'wiki-media-switcher',
  ],
  strip: [...(defaultSchema.strip || []), 'style', 'iframe', 'object', 'embed', 'form'],
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code || []),
      ['className', /^language-./, 'math-inline', 'math-display'],
    ],
    div: [
      ...(defaultSchema.attributes?.div || []),
      ['className', ...allowedDivClasses],
      'dataMediaEmbedStack',
    ],
    span: [['className', 'wiki-spoiler']],
    rt: [['className', 'furi', 'roma']],
    button: [
      ['type', 'button'],
      ['dataLyricAction', 'ruby', 'translation', 'phonetic'],
      'dataShowLabel',
      'dataHideLabel',
      'dataPrimaryLabel',
      'dataAlternateLabel',
      'ariaPressed',
    ],
    img: [
      ...(defaultSchema.attributes?.img || []),
      'alt',
      'title',
      ['loading', 'lazy', 'eager'],
      ['decoding', 'async', 'sync', 'auto'],
    ],
    'wiki-media-embed': ['dataProvider', 'dataTarget', 'dataCaption'],
    'wiki-media-switcher': ['dataLabel'],
  },
};
