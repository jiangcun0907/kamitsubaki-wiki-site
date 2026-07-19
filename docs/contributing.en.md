# Contributing Guide

[English](contributing.en.md) / [中文](contributing.md) / [日本語](contributing.ja.md)

This guide is the main reference for editing the wiki and opening a Pull Request.

## Where to start

- For a first contribution or a browser-only edit, open the in-site [Contribution Learning Center](https://kamitsubaki.wiki/en/contribute/edit). It chooses a route by experience and places the Markdown/property reference on the same page.
- If you already know the repository and need field or command details, continue with this document.
- When editing a specific entry, start from its “Edit source” action so the learning center can carry the exact target path.

Recommended order: **choose a route → confirm the target → look up syntax while editing → review the diff → open the PR → follow CI and review**. You do not need to learn all of Markdown before starting.

## Edit Content

Most edits belong in `src/content/`.

```text
src/content/site/       Site navigation, section labels, footer text (.json)
src/content/artists/    Artist, creator, unit, and isotope pages (.md)
src/content/projects/   Project pages and cards (.md)
src/content/logs/       Timeline/update rows (.md)
src/content/contribute/ GitHub edit-guide copy (.md)
```

Do not edit `dist/`, `.astro/`, or `node_modules/`.

## Three-Language Files

The site supports three locale routes:

```text
/zh/  Chinese, default
/ja/  Japanese
/en/  English
```

Every translatable record should have all three language files. When adding a page, create `zh.md`, `ja.md`, and `en.md`, and keep the same `translationKey`.

## Markdown Shape

Markdown files use YAML frontmatter for structured data.

```yaml
---
locale: zh
translationKey: kaf
name: "花譜"
romanizedName: "KAF"
categoryTitle: "虚拟世代的魔女们"
categorySubtitle: "VIRTUAL WITCH PHENOMENON"
categoryOrder: 1
itemOrder: 1
statusLabel: "STATUS"
status: "ACTIVE"
image: "https://placehold.co/1200x800/111/333?text=KAF"
theme:
  name: "KAF Bloom"
  accentColor: "#F29AC2"
  mutedColor: "#E63145"
  surfaceColor: "#111321"
  highlightColor: "#FFF6FA"
  palette:
    - label: "KAF Pink"
      value: "#F29AC2"
    - label: "Bloom Red"
      value: "#E63145"
    - label: "Observation Navy"
      value: "#111321"
    - label: "Soft Light"
      value: "#FFF6FA"
seo:
  title: "花譜 - KAMITSUBAKI WIKI"
  description: "Custom text for search results and link previews."
  image: "https://example.com/share-card.jpg"
  keywords:
    - "花譜"
    - "KAF"
---
```

Write article content after the second `---`. Empty bodies are allowed, but do not add filler text.

### Content security

Article HTML uses an explicit allowlist. Common typography, tables, `ruby`, `details`, and images are retained; `script`, `style`, raw `iframe`, forms, inline event handlers, and dangerous URLs are removed during the build. Audio and video must use the controlled `@[provider](ID-or-share-URL "optional caption")` shortcode. Supported providers are YouTube, bilibili, Apple Music, Spotify, NetEase Music, and QQ Music.

Authors should call Wiki shortcodes instead of writing their generated HTML, for example `{{ruby::text::reading}}`, `{{spoiler::hidden text}}`, `{{mark::important}}`, the song-page `{{lyrics-controls::en}}`, and the paired `{{details::title}}` / `{{/details}}` block. Multiline code continues to use a language-labelled Markdown fence for syntax highlighting. The HTML allowlist is the final compatibility and security boundary, not the preferred everyday authoring API.

See the [content rendering security policy](content-security.md) for the exact boundary, migration behavior, and extension procedure. Authors can also use the copyable examples in the in-site [Markdown and entry-property guide](https://kamitsubaki.wiki/en/contribute/syntax).

`theme` is optional. When present, the article page shows a palette panel and uses the entry colors for the ToC highlight, source link accent, and infobox framing.

Do not pick theme colors just because they look nice. Use this order:

1. Start from official artist pages, official key visuals, official album art, or official character material.
2. Identify stable character signals such as hair color, outfit color, recurring background color, or symbolic motif color.
3. Use `accentColor` for the strongest recognition color.
4. Use `mutedColor` for a supporting or contrasting color.
5. Keep `surfaceColor` dark so the reader remains readable instead of turning into a saturated panel.
6. Use `highlightColor` as a light highlight only.
7. Add at least 3 to 4 `palette` swatches, and name each swatch in the current language.

The five V.W.P member pages provide reference-quality examples:

```text
KAF: KAF Bloom
RIM: RIM Neuromance
HARUSARUHI: Harusaruhi Impact
ISEKAIJOUCHO: Isekaijoucho Dark Canvas
KOKO: KOKO Lightning Rock
```

If you are unsure about an entry's colors, leave `theme` out for now instead of adding a temporary palette.

## Artist Page Template

For people, singer, or creator entries under `src/content/artists/`, use the same wiki-style outline whenever possible:

```md
## Overview
## Role and Creative Position
## Activity History
## Representative Works and Related Entries
## Related Projects / Setting
## References
## External Links
```

Guidelines:

- `Overview`: explain who the subject is, where they belong, and why they matter.
- `Activity History`: keep only meaningful milestones, not a year-by-year dump.
- `References`: prefer official artist pages, official news posts, official releases, and major media interviews.
- `External Links`: keep it small and useful.

## Homepage Display

The homepage DATABASE scans the first folder level under `src/content/artists/` as the category.

```text
src/content/artists/vwp/kaf/zh.md
                    ^^^ homepage category
```

To add a new category, create a new first-level folder and add three-language entries. `categoryTitle`, `categorySubtitle`, `categoryOrder`, `itemOrder`, and `code` are optional display overrides. When they are missing, the site uses the folder name, entry name, and default sorting.

## Metadata

The `seo` block is optional. When it is missing, the site scans the entry automatically:

- `name`, `romanizedName`, category, and status become fallback metadata.
- The first Markdown paragraph becomes the page description.
- `image` becomes the Open Graph and Twitter preview image.

Use `seo.title`, `seo.description`, `seo.image`, `seo.keywords`, or `seo.noindex` only when a page needs manual control. Set `PUBLIC_SITE_URL` during deployment to make canonical URLs and local images absolute.

## Add A New Entry

1. Create a folder under the right content category.
2. Add `zh.md`, `ja.md`, and `en.md`.
3. Keep `translationKey` identical across the three files.
4. Fill the required frontmatter fields.
5. Leave the body empty if real content is not ready.
6. Run local verification.
7. Open a Pull Request.

### V.W.P Launch Samples

`src/content/artists/vwp/` now contains launch-quality sample entries for the five members. If you are new, copy those patterns first:

- how the frontmatter is structured
- how the article sections are ordered
- how references and external links are closed out

Imitating a good existing entry is the easiest way to stay inside the repo's conventions.

## Verify Locally

CI and local development use the same commands:

```bash
pnpm test
pnpm check
pnpm build
```

If `pnpm check` reports a content schema error, compare the failing file with `src/content.config.ts`.

## Pull Request Flow

1. Create a branch from `main`.
2. Edit content or implementation.
3. Run local verification.
4. Commit and push your branch.
5. Open a Pull Request into `main`.
6. Wait for GitHub Actions CI.
7. Fix CI or review feedback in the same branch.

The CI workflow lives at `.github/workflows/ci.yml`.

## Merge Checklist

- No filler article text.
- All required locale files exist.
- `pnpm test`, `pnpm check`, and `pnpm build` pass.
- The PR changes only relevant files.
- Generated folders such as `dist/` are not committed.
