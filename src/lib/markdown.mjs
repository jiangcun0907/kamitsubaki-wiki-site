import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeShiki from '@shikijs/rehype';
import remarkMath from 'remark-math';
import { rehypeMaterializeMediaEmbeds } from './mediaEmbed.mjs';
import remarkMediaEmbed from './mediaEmbed.mjs';
import { wikiHtmlSchema } from './htmlPolicy.mjs';
import remarkWikiShortcodes from './wikiShortcodes.mjs';

export const siteMarkdownOptions = {
  syntaxHighlight: false,
  remarkPlugins: [remarkMath, remarkWikiShortcodes, remarkMediaEmbed],
  rehypePlugins: [
    rehypeRaw,
    [rehypeSanitize, wikiHtmlSchema],
    rehypeMaterializeMediaEmbeds,
    rehypeKatex,
    [rehypeShiki, { theme: 'github-dark' }],
    [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
  ],
};

let markdownRendererPromise;

async function getMarkdownRenderer() {
  if (!markdownRendererPromise) {
    markdownRendererPromise = createMarkdownProcessor(siteMarkdownOptions);
  }

  return markdownRendererPromise;
}

export async function renderMarkdownFragment(markdown) {
  const source = String(markdown || '').trim();

  if (!source) {
    return '';
  }

  const renderer = await getMarkdownRenderer();
  const { code } = await renderer.render(source);
  return code;
}
