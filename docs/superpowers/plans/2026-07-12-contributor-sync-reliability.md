# Contributor Sync Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make contributor synchronization fail loudly when unconfigured, enrich Git identities when possible, replace stale Git-history snapshots, and report unique-commit statistics.

**Architecture:** The frontend sync collector remains privacy-safe and gains an injectable GitHub identity resolver plus replacement payload metadata. The authenticated backend sync route validates the full payload, replaces only the `git-history` source snapshot, rebuilds contributor statistics, and excludes bots from public queries.

**Tech Stack:** Node.js scripts and tests, GitHub Actions, Cloudflare Workers, D1 SQL, backend Node.js test harness.

## Global Constraints

- Never serialize plaintext author email addresses.
- GitHub enrichment failure must fall back safely.
- Missing `CONTRIBUTOR_SYNC_TOKEN` must fail GitHub Actions.
- Replacement applies only after authentication and payload validation.
- Public API response shape remains compatible.
- Do not stage frontend `promo/`.

---

### Task 1: Workflow configuration must be observable

**Files:** Modify `.github/workflows/sync-contributors.yml`; modify `tests/contributor-roster.test.mjs`.

**Interfaces:** Workflow passes `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, and `CONTRIBUTOR_SYNC_TOKEN`; missing secret exits non-zero.

- [ ] Add source tests asserting a GitHub error annotation and `exit 1`, built-in token wiring, repository wiring, and manual dispatch retention.
- [ ] Run the focused test; expect failure because workflow currently exits zero.
- [ ] Update workflow permissions and environment, replacing the skip branch with an actionable failure.
- [ ] Run focused tests; expect pass.
- [ ] Commit as `fix: fail unconfigured contributor sync`.

### Task 2: GitHub identity enrichment and replacement payload

**Files:** Create `scripts/github-contributor-identity.mjs`; modify `scripts/sync-contributors.mjs`; modify `scripts/contributor-history.mjs`; modify `tests/contributor-roster.test.mjs`.

**Interfaces:** `createGithubIdentityResolver({ token, repository, fetchImpl })` returns async `(commitSha, fallbackAuthor) => author`; sync body contains `replaceSource: true`.

- [ ] Add tests using an injected fetch implementation for successful GitHub author resolution, API fallback, no email output, resolver caching, and replacement body contract.
- [ ] Run focused tests; expect module or contract failure.
- [ ] Implement cached commit API lookup, merge enriched identities into collected groups, and submit replacement semantics with result logging.
- [ ] Run focused tests; expect pass.
- [ ] Commit as `feat: enrich contributor sync identities`.

### Task 3: Backend replacement sync

**Files:** Modify backend `src/index.js`; modify backend `src/storage.js`; modify backend `tests/contributors.test.mjs`.

**Interfaces:** `recordContributionSync(db, { events, source, replaceSource })`; authenticated admin route accepts boolean `replaceSource`.

- [ ] Add backend tests that seed stale file-level events, perform replacement, and assert only the normalized snapshot remains; assert invalid events do not erase data.
- [ ] Run backend contributor tests; expect replacement assertions to fail.
- [ ] Validate all raw events before storage, delete matching-source events inside the replacement operation, insert normalized events, and rebuild stats for affected and orphaned contributors.
- [ ] Run backend contributor tests; expect pass.
- [ ] Commit in the backend repository as `fix: replace contributor history snapshots`.

### Task 4: Unique public counts and bot exclusion

**Files:** Modify backend `src/storage.js`; modify backend `tests/contributors.test.mjs`.

**Interfaces:** Summary and entry queries count unique `contributor_id + commit_sha` contributions and exclude `is_bot = 1` from totals, rankings, and recent activity.

- [ ] Add tests for one commit touching multiple locales, two human contributors, and one bot; assert unique totals and no bot exposure.
- [ ] Run backend tests; expect current count and bot assertions to fail.
- [ ] Update aggregate and recent SQL while preserving serialized response keys.
- [ ] Run the full backend test suite; expect pass.
- [ ] Commit as `fix: report unique human contributions`.

### Task 5: End-to-end verification and configuration handoff

**Files:** Modify documentation only if configuration is not already explicit.

**Interfaces:** Produces a tested frontend workflow and backend sync contract.

- [ ] Run frontend `pnpm test`, `pnpm check`, and `pnpm build`.
- [ ] Run the backend full test suite and Worker checks defined by its package scripts.
- [ ] Generate a random secret locally without printing it and document the two exact configuration targets rather than storing it in Git.
- [ ] Verify public API compatibility against local backend tests and verify workflow YAML source contracts.
- [ ] Run `git diff --check` and report deployment commands and required secrets.
