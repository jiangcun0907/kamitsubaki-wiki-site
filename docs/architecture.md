# Architecture Notes

This project is a static Astro site with URL-based internationalization and content separated from implementation.

## Runtime Shape

```text
Browser
  -> / redirects to /zh/
  -> /zh/ /ja/ /en/
  -> Astro-rendered static HTML
  -> local Tailwind CSS bundle
  -> small browser interaction script
```

The site does not need a backend at runtime.

## Content Flow

```text
src/content/*.json and *.md
  -> src/content.config.ts validates schemas
  -> Astro remark/rehype plugins parse markdown and math
  -> src/pages/[locale]/index.astro reads collections for home page
  -> src/pages/[locale]/artists/[...id].astro generates detailed wiki pages
  -> src/lib/homeData.mjs filters, groups, and sorts data
  -> src/components/*.astro render page sections
```

Implementation files should not contain large content arrays. They should receive already-localized data through props.

## Routing

```text
src/pages/index.astro                   Root redirect page
src/pages/[locale]/index.astro          Static localized home pages
src/pages/[locale]/artists/[...id].astro Static detailed wiki article pages
```

Supported locales are declared in `src/lib/i18n.mjs`:

```text
zh  default Chinese route
ja  Japanese route
en  English route
```

Astro builds four pages:

```text
/index.html
/zh/index.html
/ja/index.html
/en/index.html
```

## Components

Current page sections:

```text
SiteNav          Fixed brand/navigation/language switcher
Hero             First viewport
AboutSection     Preface copy
ArtistDatabase   Category sidebar and artist rows
ProjectsSection  Project cards
LogSection       Update log rows
WikiInfoBox      Sidebar metadata card for wiki pages
TableOfContents  Scroll-spy sticky navigation for wiki articles
SiteFooter       Footer links and disclaimers
```

Components should stay presentational. If data needs filtering, grouping, fallback handling, or sorting, put that logic in `src/lib/`.

## Styling

Tailwind CSS v4 is compiled locally through `@tailwindcss/vite` and uses `@tailwindcss/typography` to style parsed markdown articles.

The global style entry is:

```text
src/styles/global.css
```

That file contains:

- Tailwind import and theme tokens
- custom cursor styles
- preloader styles
- reveal animation styles
- list row hover effects
- crosshair/noise/marquee visual effects

Avoid adding a CDN Tailwind script back into the layout. The test suite checks for this.

## Browser Interactions

The browser script is:

```text
src/scripts/siteInteractions.js
```

It owns:

- preloader hide timing
- custom cursor movement and hover state
- artist hover background reveal
- scroll reveal animation

Keep this file independent from content. It should query DOM elements and CSS classes, not know about specific artists or languages.

## Tests

The test suite uses Node's built-in test runner.

Current coverage:

```text
tests/content-separation.test.mjs  Content lives in collections, not old data modules
tests/i18n.test.mjs                Locale files and route assumptions
tests/local-assets.test.mjs        No runtime Tailwind CDN dependency
tests/site-data.test.mjs           Key content records and ordering
```

Astro schema and component type checks are covered by:

```bash
pnpm check
```

Static route generation is covered by:

```bash
pnpm build
```

