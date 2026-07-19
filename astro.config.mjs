import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import { siteMarkdownOptions } from './src/lib/markdown.mjs';

export default defineConfig({
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    syntaxHighlight: false,
    processor: unified(siteMarkdownOptions),
  },
});
