# Contributor Roster Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw contributor log with a localized, community-first honor wall that deduplicates Git commits, keeps light statistics, links into the contribution guide, and stays compact on entry pages.

**Architecture:** Add a pure normalization module between the contributor API and the DOM renderer so legacy file-level records can be grouped by commit without backend coordination. Refactor Git-history collection into importable pure helpers so synchronization emits one event per contributor/commit/entry with locale metadata. Keep the Astro component responsible for localized copy and route-aware contribution links, while the browser script owns state and accessible interaction.

**Tech Stack:** Astro 6, browser ES modules, Node.js built-in test runner, plain CSS, Git history synchronization, existing contributor Worker API.

## Global Constraints

- Do not add dependencies.
- Preserve the existing dark observation-terminal visual language.
- Community recognition is primary; rank and counts are secondary.
- A contribution is one unique Git commit, not one changed file.
- Entry mode shows at most three recent unique commits.
- Never expose plaintext Git author email addresses.
- Keep compatibility with the existing summary and entry API payloads.
- Do not modify or stage the unrelated `promo/` directory.

---

### Task 1: Normalize legacy and enhanced contributor payloads

**Files:**
- Create: `src/lib/contributorRosterData.mjs`
- Modify: `tests/contributor-roster.test.mjs`

**Interfaces:**
- Produces: `normalizeContributorData(data, { mode, recentLimit })` returning `{ totals, topContributors, recent }`.
- Produces: recent items with `commitSha`, `contributor`, `committedAt`, `summary`, `entryIds`, `locales`, and `commitUrl`.

- [ ] **Step 1: Write failing normalization tests**

Add tests that pass three file-level records for one commit and assert one recent item, three locales, one unique contribution, and one maintained entry. Add a second test asserting entry mode limits recent activity to three unique commits.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/contributor-roster.test.mjs`

Expected: FAIL because `src/lib/contributorRosterData.mjs` does not exist.

- [ ] **Step 3: Implement minimal normalization**

Implement stable commit keys, locale and entry aggregation, bot filtering, contributor ranking, conservative fallback totals, and entry-mode limiting. Preserve enhanced arrays such as `entryIds` and `locales` when already supplied by the API.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/contributor-roster.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/contributorRosterData.mjs tests/contributor-roster.test.mjs
git commit -m "feat: normalize contributor activity"
```

### Task 2: Aggregate Git history safely before synchronization

**Files:**
- Create: `scripts/contributor-history.mjs`
- Modify: `scripts/sync-contributors.mjs`
- Modify: `tests/contributor-roster.test.mjs`

**Interfaces:**
- Produces: `parseGithubLogin(email)`, `contributorFromAuthor(name, email)`, `parseContentPath(path)`, and `collectContributionEvents(gitOutput, commitBaseUrl)`.
- `sync-contributors.mjs` consumes `collectContributionEvents` and submits its result unchanged.

- [ ] **Step 1: Write failing history-aggregation tests**

Add a synthetic Git log containing three locale files in one commit. Assert that the collector returns one event with `locales: ['en', 'ja', 'zh']`, one entry identifier, and no plaintext `email` property. Retain assertions for GitHub noreply identity and hashed private email identity.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/contributor-roster.test.mjs`

Expected: FAIL because `scripts/contributor-history.mjs` does not exist.

- [ ] **Step 3: Extract and implement aggregation**

Move identity and path parsing into the importable module. Group changed files by `commitSha + contributor.id + collection + entryId`; retain `path` as the first path for backend compatibility and add sorted `paths` and `locales` arrays. Keep the sync command responsible only for environment validation, Git invocation, HTTP submission, and reporting.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/contributor-roster.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/contributor-history.mjs scripts/sync-contributors.mjs tests/contributor-roster.test.mjs
git commit -m "fix: aggregate contributor history by commit"
```

### Task 3: Define localized honor-wall content and routes

**Files:**
- Modify: `src/components/ContributorRoster.astro`
- Modify: `tests/contributor-roster.test.mjs`

**Interfaces:**
- Component continues consuming `mode`, `locale`, `collection`, and `entryId`.
- Component provides serialized copy plus `data-guide-href` and `data-edit-href` to the renderer.

- [ ] **Step 1: Write failing component-contract tests**

Assert localized copy includes recognition, rank, locale labels, retry, empty and error states. Assert summary mode links to `/{locale}/contribute/edit`, while entry mode builds a target path for the current artist locale file.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/contributor-roster.test.mjs`

Expected: FAIL because the new copy and data attributes are absent.

- [ ] **Step 3: Implement localized component contract**

Add Chinese, Japanese, and English labels for the honor wall, fan-maintained explanation, CTA buttons, ranking, locale names, retry and state messages. Add route-aware guide URLs without changing the public component API.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/contributor-roster.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ContributorRoster.astro tests/contributor-roster.test.mjs
git commit -m "feat: add localized contributor honor wall copy"
```

### Task 4: Render the honor wall and compact entry roster

**Files:**
- Modify: `src/scripts/contributorRoster.js`
- Modify: `tests/contributor-roster.test.mjs`

**Interfaces:**
- Consumes: `normalizeContributorData` from `src/lib/contributorRosterData.mjs`.
- Produces: summary honor-wall markup, compact entry markup, readable activity rows, and retry behavior.

- [ ] **Step 1: Write failing renderer-contract tests**

Assert the script imports the normalizer, renders rank markers and CTA links, uses locale chips, caps entry activity, exposes an error state, and handles a retry control. Assert raw paths are only fallback labels.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/contributor-roster.test.mjs`

Expected: FAIL because the old renderer has no honor-wall, chips, or retry contract.

- [ ] **Step 3: Implement the new renderer**

Render contributor cards with rank as secondary metadata in summary mode and compact people rows in entry mode. Format activity as readable entry maintenance, add locale chips, keep commit links, render separate empty and error states, and reset `data-contributor-roster-status` before retrying.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/contributor-roster.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/contributorRoster.js tests/contributor-roster.test.mjs
git commit -m "feat: render contributor honor wall"
```

### Task 5: Build responsive honor-wall styling

**Files:**
- Modify: `src/styles/global.css`
- Modify: `tests/contributor-roster.test.mjs`

**Interfaces:**
- Styles the BEM classes emitted by Tasks 3 and 4.

- [ ] **Step 1: Write failing style-contract tests**

Assert CSS contains summary contributor cards, rank markers, CTA actions, locale chips, compact entry activity, focus-visible states, and mobile breakpoints.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/contributor-roster.test.mjs`

Expected: FAIL because the new class rules are absent.

- [ ] **Step 3: Implement responsive CSS**

Replace the flat log presentation with a stronger header, restrained statistic tiles, responsive contributor cards, readable activity rows, compact entry-specific density, accessible focus treatment, and single-column mobile behavior. Ensure fixed floating actions do not obscure roster controls.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/contributor-roster.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css tests/contributor-roster.test.mjs
git commit -m "style: redesign contributor roster"
```

### Task 6: Verify complete behavior and visual quality

**Files:**
- Modify only files required to fix verification failures.

**Interfaces:**
- Validates the complete feature; produces no new public interface.

- [ ] **Step 1: Run all automated tests**

Run: `pnpm test`

Expected: all tests pass.

- [ ] **Step 2: Run Astro diagnostics**

Run: `pnpm check`

Expected: zero errors.

- [ ] **Step 3: Build production output**

Run: `pnpm build`

Expected: successful static build.

- [ ] **Step 4: Inspect desktop and mobile pages**

Start the local Astro server and inspect `/{locale}/` and `/zh/artists/solo/teresa/` at 1440×1000 and 390×844. Confirm no overlap, truncation, unreadable contrast, repeated commits, overlong entry roster, or inaccessible action.

- [ ] **Step 5: Review the final diff and commit verification fixes**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; only intended files and untouched `promo/` appear.

```bash
git add <only intended verification fixes>
git commit -m "fix: polish contributor roster responsiveness"
```
