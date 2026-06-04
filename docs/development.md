# Development Guide

## Setup

Install dependencies with pnpm:

```bash
pnpm install
```

Run the local Astro dev server:

```bash
pnpm dev
```

Astro usually serves the site at:

```text
http://127.0.0.1:4323/
```

If that port is already in use, Astro may choose another nearby port.

## Daily Workflow

1. Edit content in `src/content/` or implementation files in `src/`.
2. Check the page in the browser.
3. Run verification:

```bash
pnpm test
pnpm check
pnpm build
```

4. Review changed files:

```bash
git status --short
```

5. Commit when the change is coherent.

## Verification Commands

```bash
pnpm test
```

Runs Node tests for content separation, i18n assumptions, and key records.

```bash
pnpm check
```

Runs Astro diagnostics, including Content Collection schema validation.

```bash
pnpm build
```

Builds the static site and confirms localized routes can be generated.

## Dev Server Notes

If you add, remove, or rename content collections or change `src/content.config.ts`, restart the dev server. Astro can hot-reload many content edits, but collection shape changes are cleaner after a restart.

If the browser shows an Astro error page after schema changes:

1. Stop the dev server.
2. Start it again with `pnpm dev`.
3. Reload the page.

## Git Notes

This repository was initialized locally with Git. A good first commit after the current setup would include:

```text
README.md
docs/
astro.config.mjs
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.json
src/
tests/
```

Generated or installed files should stay ignored:

```text
node_modules/
dist/
.astro/
.pnpm-store/
```

## Troubleshooting

### `pnpm check` reports content schema errors

Open `src/content.config.ts` and compare the failing content file against its schema. Common causes:

- missing `locale`
- missing `translationKey`
- `order` written as a string instead of a number
- unsupported locale value
- missing one of the required site chrome sections

### A new record appears in one language but not another

Check that all three files exist and share the same `translationKey`:

```text
example.zh.json
example.ja.json
example.en.json
```

Also check that the `locale` field inside each file matches its filename.

### Language switcher does not show the expected label

Edit `supportedLocales` in all three site files:

```text
src/content/site/zh.json
src/content/site/ja.json
src/content/site/en.json
```

Keep the `code`, `label`, and `shortLabel` values consistent across languages unless there is a deliberate product reason to localize the language names differently.

### Page styling looks like default browser styles

Run:

```bash
pnpm build
```

If build passes, restart `pnpm dev` and reload. The project uses local Tailwind compilation, so it should not depend on `cdn.tailwindcss.com` at runtime.

