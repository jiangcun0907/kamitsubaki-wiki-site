# KAMITSUBAKI Fan Wiki Site

An unofficial KAMITSUBAKI STUDIO fan wiki prototype built as a static Astro site.

The project is intentionally split into two layers:

- `src/content/` contains editable site content.
- `src/components/`, `src/pages/`, `src/layouts/`, `src/styles/`, and `src/scripts/` contain the page implementation.

## Documentation

- [Content editing guide](docs/content-editing.md): how to edit artists, projects, logs, and translations.
- [Architecture notes](docs/architecture.md): how content, routing, components, styles, and scripts fit together.
- [Development guide](docs/development.md): local setup, verification, Git workflow, and troubleshooting.

## Languages

The site uses URL-based internationalization:

```text
/zh/  Chinese, default
/ja/  Japanese
/en/  English
/     Redirects to /zh/
```

Content files use this naming pattern:

```text
translation-key.locale.json
```

Example:

```text
src/content/artists/kaf.zh.json
src/content/artists/kaf.ja.json
src/content/artists/kaf.en.json
```

## Stack

- Astro static output
- pnpm package manager
- Tailwind CSS v4 compiled locally through Vite
- Astro Content Collections for structured content

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm check
pnpm build
```

Local development defaults to Astro's dev server. In this workspace it is currently being used at:

```text
http://127.0.0.1:4323/
```

## Project Structure

```text
src/content.config.ts     Content collection schemas
src/content/              Editable content JSON files
src/lib/homeData.mjs      Content-to-component data shaping
src/lib/i18n.mjs          Locale list and language switch helpers
src/pages/index.astro     Root redirect to /zh/
src/pages/[locale]/       Localized home pages
src/components/           Presentational page sections
src/styles/global.css     Tailwind entry and global visual system
src/scripts/              Browser-side interactions
tests/                    Node test runner checks
```

## Content Model

All public-facing content should live in Astro Content Collections under `src/content/`.

Records that appear in all languages use a shared `translationKey` and one file per locale:

```text
src/content/artists/kaf.zh.json
src/content/artists/kaf.ja.json
src/content/artists/kaf.en.json
```

The implementation reads collections, filters by locale, shapes records in `src/lib/homeData.mjs`, then passes data into presentational components.

## Editing Rule

Change content in `src/content/`.

Change layout, style, or interaction behavior in `src/components/`, `src/styles/`, or `src/scripts/`.

Do not reintroduce large hardcoded content arrays into components or pages.

Do not edit `dist/`, `.astro/`, or `node_modules/`; these are generated or installed artifacts.

## Verification

After editing content or implementation, run:

```bash
pnpm test
pnpm check
pnpm build
```

`pnpm check` is especially important after content edits because it validates the Astro Content Collections schema.
