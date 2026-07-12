# Contributor Roster Redesign

## Goal

Turn the existing contributor log into a community-focused honor wall that thanks contributors, makes maintenance activity understandable to non-technical fans, and provides a clear path into the contribution guide. Preserve light ranking and statistics without making competition the primary tone.

## Scope

The redesign covers the contributor roster on the localized home page and artist entry pages, the browser renderer, contribution-history synchronization, and automated tests. It does not add a standalone contributor profile page, change authentication, or introduce new dependencies.

## Product Direction

The roster balances recognition and statistics:

- Community recognition is the primary visual and editorial message.
- Rank numbers, contribution counts, and maintained-entry counts remain visible as secondary evidence.
- Copy should be understandable without prior Git or GitHub knowledge.
- GitHub profiles and commits remain linked so every public record is verifiable.
- The existing dark observation-terminal visual language remains intact.

## Information Architecture

### Home summary

The home page presents a full-width contributor honor wall containing:

1. A welcoming heading and short explanation that the Wiki is maintained by fans.
2. A primary link to start contributing and a secondary link to the contribution guide.
3. Compact global statistics for contributors, unique commits, and maintained entries.
4. Contributor cards with avatar or initials, display name, light rank, unique contribution count, maintained-entry count, and optional GitHub link.
5. A recent-maintenance feed whose rows describe the affected entry and locales in readable language.

### Entry summary

Artist pages present a compact roster below the information card containing:

1. The entry's contributor count and unique contribution count.
2. A compact contributor list rather than large ranking cards.
3. At most three recent unique commits.
4. A contribution call to action targeted to the current source file.

The entry roster must not grow into a long sidebar log.

## Contribution Data Semantics

- A site-wide contribution is one unique Git commit, regardless of how many content files it changes.
- A maintained entry is one unique `collection + entryId` pair.
- On an entry page, a commit counts once for that entry even when it modifies multiple locale files.
- Locale files changed by the same commit are aggregated and exposed as locale labels.
- A commit that changes multiple entries appears once in the site-wide recent feed and may list multiple affected entries.
- Contributor counts are based on stable contributor identity. GitHub noreply addresses map to GitHub accounts; other email addresses remain private and are represented by a stable hash.
- Bots are not shown in the honor wall or human contributor total.

## Rendering and Interaction

Contributor data continues to load from the existing public summary and entry endpoints. The client renderer normalizes both current and enhanced API payloads so the UI remains deployable without a coordinated backend release.

The renderer provides distinct states:

- Loading: brief, accessible loading message.
- Empty: welcoming message and a contribution-guide link.
- Error: clear failure message and a retry button.
- Loaded: honor wall or compact entry roster.

External profile and commit links open safely in a new tab. The retry action resets the roster request state and attempts the same endpoint again.

## Visual Design

The home roster uses restrained cards, thin borders, muted metadata, and a stronger heading and call to action. Rank appears as a small ordinal marker, not a podium. Contributor names and avatars receive the strongest visual emphasis; numbers remain secondary.

Recent activity uses readable entry labels first, locale chips second, and commit metadata last. Raw internal paths are used only as a fallback.

On mobile, statistics wrap cleanly, contributor cards use a single column, action buttons remain reachable, and activity metadata does not overflow. On entry pages, the component stays compact at desktop sidebar widths and becomes full-width naturally on mobile.

## Synchronization

The synchronization script groups file-level Git history events by commit and contributor before submission while retaining affected entry and locale details. It must not submit plaintext author email addresses.

Because the current backend may still store file-level events, the browser renderer also deduplicates recent activity by commit SHA. This provides immediate correctness for visible recent records and compatibility with already-synced data. Accurate global unique-commit totals require the enhanced sync payload or backend support; until then the UI must label existing totals conservatively and must not imply file changes are commits.

## Testing

Automated tests cover:

- Grouping locale files from the same commit into one visible activity.
- Deduplicating unique commits and maintained entries.
- Preserving private author identity behavior.
- Rendering home honor-wall content, ranking metadata, and contribution links.
- Rendering at most three recent records in entry mode.
- Distinct loading, empty, and error/retry states.
- Localized Chinese, Japanese, and English copy.

Verification includes the full Node test suite, Astro checks, production build, and browser inspection at desktop and mobile viewport sizes for both home and artist entry contexts.

## Acceptance Criteria

- The home page reads as a contributor honor wall rather than a raw Git log.
- Ranking remains visible but visually secondary to contributor recognition.
- The same commit is not repeated because it changed multiple locale files.
- Internal paths and English commit messages no longer dominate fan-facing activity rows.
- Users can reach the contribution guide directly from both roster modes.
- Entry rosters remain compact and show no more than three recent commits.
- Failure is distinguishable from an empty roster and can be retried.
- No author email address is exposed by synchronization or rendering.
- All automated and browser verification passes without touching the unrelated `promo/` directory.
