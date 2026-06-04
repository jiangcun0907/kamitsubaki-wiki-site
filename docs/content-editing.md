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

Every translatable content record should have one file per locale:

```text
translation-key.zh.json
translation-key.ja.json
translation-key.en.json
```

Each localized file must include:

```json
{
  "locale": "zh",
  "translationKey": "kaf"
}
```

`translationKey` connects the same record across languages. Keep it identical for the Chinese, Japanese, and English files.

When adding or renaming a record, update all three locale files in the same change. Missing translations currently fall back in some data-shaping paths, but complete locale coverage is the project rule.

## Content Map

```text
src/content/site/       Site-level navigation, language switcher, and page chrome
src/content/artists/    Artist, creator, unit, and isotope entries
src/content/projects/   Project cards
src/content/logs/       Update log rows
```

The schemas for these files live in `src/content.config.ts`. If a required field is missing or has the wrong type, `pnpm check` will report it.

## Field Reference

Common fields on translatable content:

```text
locale          One of zh, ja, en
translationKey  Stable ID shared by all translations of the same record
order           Manual display order inside a collection or section
```

Use lowercase, URL-safe `translationKey` values such as `kaf`, `kamitsubaki-city`, or `2024-06-01-vwp-live`.

Avoid changing `translationKey` after a record exists unless you rename all language files and update any tests or references at the same time.

## Site Configuration

Edit these files for site-wide text:

```text
src/content/site/zh.json
src/content/site/ja.json
src/content/site/en.json
```

They control:

- Top navigation labels and anchors
- Database sidebar jump links
- Language switcher labels
- Hero text
- Section headings
- Footer text and disclaimers

Keep the `supportedLocales` array consistent across `zh.json`, `ja.json`, and `en.json`.

Example:

```json
{
  "locale": "zh",
  "translationKey": "home",
  "defaultLocale": "zh",
  "supportedLocales": [
    { "code": "zh", "label": "中文", "shortLabel": "中" },
    { "code": "ja", "label": "日本語", "shortLabel": "日" },
    { "code": "en", "label": "English", "shortLabel": "EN" }
  ],
  "navItems": [
    { "label": "ABOUT", "href": "#about" }
  ],
  "databaseJumpLinks": [
    { "label": ">> V.W.P [WITCHES]", "href": "#cat-vwp" }
  ]
}
```

The `href` values should point to existing section IDs on the page. The current main anchors are:

```text
#about
#database
#projects
#log
```

## Artists

Each artist entry is one JSON file in `src/content/artists/`.

For each artist, keep one file per language:

```text
src/content/artists/kaf.zh.json
src/content/artists/kaf.ja.json
src/content/artists/kaf.en.json
```

Required fields:

```json
{
  "locale": "zh",
  "translationKey": "kaf",
  "code": "01",
  "name": "花谱",
  "romanizedName": "KAF",
  "categoryId": "cat-vwp",
  "categoryTitle": "仮想世代の魔女達",
  "categorySubtitle": "VIRTUAL WITCH PHENOMENON",
  "categoryOrder": 1,
  "itemOrder": 1,
  "meta": "DEBUT: 2018.10.18",
  "statusLabel": "STATUS",
  "status": "ACTIVE",
  "image": "https://placehold.co/1200x800/111/333?text=KAF"
}
```

Field notes:

```text
code              Short display index, for example 01 or C1
name              Localized display name
romanizedName     Latin display name or stable English-style name
categoryId        Stable category anchor, for example cat-vwp
categoryTitle     Localized category heading
categorySubtitle  Category subtitle, usually uppercase English
categoryOrder     Category display order
itemOrder         Row order inside the category
meta              Optional compact metadata shown on desktop
statusLabel       Label before status, for example STATUS or TYPE
status            Displayed status value
image             Hover background image URL
```

Optional field:

```json
{
  "inactive": true
}
```

Use `inactive: true` for entries that should render with the muted, struck-through status style.

### Artist Ordering

`categoryOrder` controls category order.

Current category order:

```text
1 cat-vwp
2 cat-solo
3 cat-creator
4 cat-isotope
```

`itemOrder` controls the order inside that category.

The category title and subtitle are repeated on each artist file so the category can be reconstructed from content alone. Keep all entries in the same category consistent for a given locale.

### Adding an Artist

1. Pick a stable `translationKey`, for example `new-artist`.
2. Create three files:

```text
src/content/artists/new-artist.zh.json
src/content/artists/new-artist.ja.json
src/content/artists/new-artist.en.json
```

3. Keep `translationKey` the same in all three files.
4. Set `locale` to the matching language code in each file.
5. Update `code`, `name`, `romanizedName`, category fields, ordering fields, status fields, and `image`.
6. Run `pnpm test` and `pnpm check`.

## Projects

Each project card is one JSON file in `src/content/projects/`.

Example:

```json
{
  "locale": "zh",
  "translationKey": "kamitsubaki-city",
  "kind": "PROJECT_ARG",
  "title": "神椿市建设中。",
  "description": "原创 IP 项目。作为玩家参与型 ARG 展开的神椿市相关记录。",
  "order": 1
}
```

`order` controls the card order.

For a new project, create all three files:

```text
src/content/projects/new-project.zh.json
src/content/projects/new-project.ja.json
src/content/projects/new-project.en.json
```

## Logs

Each log row is one JSON file in `src/content/logs/`.

Example:

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

`order` controls display order. The current page uses manual order instead of sorting by date so historical or narrative ordering can be controlled directly.

For a new log entry, use a date-prefixed translation key:

```text
src/content/logs/2026-06-04-example.zh.json
src/content/logs/2026-06-04-example.ja.json
src/content/logs/2026-06-04-example.en.json
```

## What Not To Edit For Content Changes

Avoid editing these files for ordinary content updates:

```text
src/components/
src/pages/index.astro
src/lib/homeData.mjs
src/styles/global.css
src/scripts/siteInteractions.js
```

Edit those only when changing layout, visual design, data transformation, styles, or interactions.

## Translation Checklist

Before finishing a translation change:

- Each `translationKey` has `zh`, `ja`, and `en` files.
- Each file has the matching `locale` value.
- Shared structural fields match across languages, such as `code`, `categoryId`, `categoryOrder`, `itemOrder`, `kind`, and `order`.
- Localized fields are translated, such as `name`, `categoryTitle`, `title`, `description`, and `message`.
- `pnpm test` and `pnpm check` pass.

## Validation Checklist

After content edits:

```bash
pnpm test
pnpm check
pnpm build
```

If the dev server was already running and content collections were added or schema changed, restart it.
