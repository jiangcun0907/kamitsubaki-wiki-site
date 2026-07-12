# Contributor Sync Reliability Design

## Goal

Make contributor synchronization reliable, observable, privacy-safe, and correct by unique Git commit while keeping the public honor wall current.

## Root Cause

GitHub Actions runs were marked successful even though `CONTRIBUTOR_SYNC_TOKEN` was empty. The workflow printed a skip message and exited with code zero, so new author commits reached `main` but never reached the contributor database.

The original database sync was insert-only. Re-running a corrected grouped feed would not remove old file-level events, so historical counts could remain inflated. Event identity also included the path, representing file edits rather than unique contributions.

## Frontend Repository

- The workflow fails clearly when `CONTRIBUTOR_SYNC_TOKEN` is absent.
- Pushes that change content trigger synchronization immediately.
- A daily scheduled run repairs missed pushes or temporary service failures.
- `GITHUB_TOKEN` and repository identity are passed to the sync script.
- Git history is grouped by contributor, commit, collection, and entry.
- GitHub's commit API enriches commit authors with login, avatar, and profile URL when possible.
- When a commit author is unavailable, an associated pull request author may provide the public GitHub identity.
- The sync payload declares replacement semantics for the `git-history` source.

## Backend Repository

- A validated replacement flag is accepted only by the authenticated admin sync route.
- Replacement removes prior events for the same source before inserting the complete normalized snapshot.
- Contributor statistics are rebuilt after replacement, including contributors who no longer have events.
- Counts use unique commit semantics and bots are excluded from public totals and rankings.
- Contributor sync tokens are compared using fixed-length digests and a constant-time comparison.
- Public API response keys remain compatible with the existing roster.

Replacement happens only after authentication and payload validation. Invalid input does not delete the existing snapshot.

## Privacy

Plaintext author email addresses are never sent to or returned by the backend. Private Git identities use a one-way email hash only when no public GitHub identity can be resolved.

## Configuration

The same random secret value must be configured as:

- GitHub Actions repository secret `CONTRIBUTOR_SYNC_TOKEN` in `LinkTh1rsty/kamitsubaki-wiki-site`.
- Cloudflare Worker secret `CONTRIBUTOR_SYNC_TOKEN` for the AI observer backend.

The workflow uses the built-in `GITHUB_TOKEN`; no personal access token is required. `CONTRIBUTORS_API_BASE` remains optional because the production Worker URL has a default.

## Error Handling and Observability

- Missing sync configuration fails the Action with an actionable error annotation.
- GitHub identity enrichment failure is non-fatal and falls back to the privacy-safe Git identity.
- Backend replacement and insertion errors return non-success responses.
- The public roster distinguishes loading, empty, loaded, and API failure states.
- Daily full-history synchronization provides recovery after missed event-driven runs.

## Acceptance Criteria

- Missing contributor configuration cannot appear as a successful sync.
- A full replacement removes historical file-level duplicates.
- Counts represent unique human commits and exclude bots.
- Aqaz and later contributors appear after backend deployment, secret configuration, and a successful sync.
- Plaintext author email addresses are never serialized.
- A missed push-triggered run is repaired by the next scheduled synchronization.
