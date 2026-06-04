# Content Editing Guide

This site keeps content separate from implementation. Most wiki updates should only touch files in `src/content/`.

## Locales

The site supports three URL-based locales:

```text
zh  Chinese, default
ja  Japanese
en  English
```

The root path `/` points users to `/zh/`.

Every translatable content record should have one file per locale.

## Content Map

```text
src/content/site/       Site-level navigation, language switcher, and page chrome (.json)
src/content/artists/    Artist, creator, unit, and isotope entries (.md)
src/content/projects/   Project cards (.md)
src/content/logs/       Update log rows (.json)
```

The schemas for these files live in `src/content.config.ts`. If a required field is missing or has the wrong type, `pnpm check` will report it.

## Artists & Projects (Markdown)

Artists and Projects are written as **Markdown (`.md`) files**. This enables rich, encyclopedia-style detail pages.

For each artist, keep one file per language in a dedicated folder:

```text
src/content/artists/vwp/kaf/zh.md
src/content/artists/vwp/kaf/ja.md
src/content/artists/vwp/kaf/en.md
```

### Frontmatter (Data)

At the top of each `.md` file, use YAML frontmatter to define the structured data.

```yaml
---
locale: zh
translationKey: kaf
code: '01'
name: 花谱
romanizedName: KAF
categoryId: cat-vwp
categoryTitle: 仮想世代の魔女達
categorySubtitle: VIRTUAL WITCH PHENOMENON
categoryOrder: 1
itemOrder: 1
meta: DEBUT: 2018.10.18
statusLabel: STATUS
status: ACTIVE
image: https://placehold.co/1200x800/111/333?text=KAF
---

## 简介
在这里编写详细的角色介绍。支持所有的 Markdown 语法。
```

### Extended Markdown & LaTeX Support

The Astro wiki supports advanced Markdown formatting for writing rich articles:

1. **Standard Markdown**: Headings (`##`), bold (`**bold**`), lists, blockquotes, and tables are fully supported.
2. **GitHub Flavored Markdown (GFM)**: Use tables, strikethrough, and task lists seamlessly.
3. **LaTeX Math Equations**: Write beautiful mathematical formulas using KaTeX.
   - Inline math: `$E = mc^2$`
   - Block math: 
     ```math
     $$
     \frac{1}{2}
     $$
     ```
4. **External Links**: Links pointing to external websites will automatically open in a new tab (`target="_blank" rel="noopener noreferrer"`).
5. **Auto-linked Headings**: All `##` and `###` headings automatically generate anchors for the Table of Contents sidebar.

## Site Configuration & Logs (JSON)

Site-wide UI text and short update logs remain in `.json` format.

```text
src/content/site/zh.json
src/content/logs/2024/2024-06-01-vwp-live/zh.json
```

Example JSON log:

```json
{
  "locale": "zh",
  "translationKey": "2024-06-01-vwp-live",
  "date": "2024.06.01",
  "type": "UPDATE",
  "message": "V.W.P 3rd ONE-MAN LIVE 曲目数据已追加。",
  "order": 1
}
```

## Validation Checklist

After content edits:

```bash
pnpm test
pnpm check
pnpm build
```

If the dev server was already running and content collections were added or schema changed, restart it.
