import { execFileSync } from 'node:child_process';
import { collectContributionEvents } from './contributor-history.mjs';
import { createGithubIdentityResolver } from './github-contributor-identity.mjs';

const apiBase = process.env.CONTRIBUTORS_API_BASE || process.env.PUBLIC_AI_OBSERVER_API_BASE;
const syncToken = process.env.CONTRIBUTOR_SYNC_TOKEN;
const githubToken = process.env.GITHUB_TOKEN || '';
const githubRepository = process.env.GITHUB_REPOSITORY || '';
const commitBaseUrl = process.env.CONTRIBUTORS_COMMIT_BASE_URL || 'https://github.com/linkth1rsty/kamitsubaki-wiki-site/commit';
const contentRoots = [
  'src/content/artists',
  'src/content/projects',
  'src/content/logs',
  'src/content/contribute',
  'src/content/site',
];
function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function collectEvents() {
  const output = runGit([
    'log',
    '--name-only',
    '--format=%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%s',
    '--',
    ...contentRoots,
  ]);
  return collectContributionEvents(output, commitBaseUrl);
}

async function main() {
  if (!apiBase) {
    throw new Error('Set CONTRIBUTORS_API_BASE or PUBLIC_AI_OBSERVER_API_BASE before syncing contributors.');
  }
  if (!syncToken) {
    throw new Error('Set CONTRIBUTOR_SYNC_TOKEN before syncing contributors.');
  }

  const collectedEvents = collectEvents();
  const resolveGithubIdentity = createGithubIdentityResolver({
    token: githubToken,
    repository: githubRepository,
  });
  let identityEnriched = 0;
  const events = await Promise.all(collectedEvents.map(async (event) => {
    const fallback = { contributor: event.contributor, identity: event.identity };
    const resolved = await resolveGithubIdentity(event.commitSha, fallback);
    if (resolved.contributor.id !== fallback.contributor.id) identityEnriched += 1;
    return { ...event, ...resolved };
  }));
  const response = await fetch(new URL('/api/admin/contributors/sync', apiBase), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${syncToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'git-history',
      replaceSource: true,
      events,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Contributor sync failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  console.log(`Synced ${body.accepted ?? events.length} contribution events from ${body.contributors ?? 0} contributors; ${identityEnriched} events enriched by GitHub.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
