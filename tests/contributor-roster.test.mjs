import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readProjectFile(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('contributor roster is mounted on the home page and artist entry pages', async () => {
  const homePage = await readProjectFile('../src/pages/[locale]/index.astro');
  const artistPage = await readProjectFile('../src/pages/[locale]/artists/[...id].astro');

  assert.match(homePage, /import ContributorRoster/);
  assert.match(homePage, /<ContributorRoster mode="summary" locale=\{locale\}/);
  assert.match(artistPage, /import ContributorRoster/);
  assert.match(artistPage, /<ContributorRoster mode="entry" locale=\{localeCode\} collection="artists" entryId=\{id\}/);
});

test('contributor roster fetches public summary and entry contribution APIs', async () => {
  const component = await readProjectFile('../src/components/ContributorRoster.astro');
  const script = await readProjectFile('../src/scripts/contributorRoster.js');
  const css = await readProjectFile('../src/styles/global.css');

  assert.match(component, /data-contributor-roster/);
  assert.match(component, /PUBLIC_AI_OBSERVER_API_BASE/);
  assert.match(script, /api\/contributors\/summary/);
  assert.match(script, /api\/contributors\/entry/);
  assert.match(script, /searchParams\.set\('collection'/);
  assert.match(script, /searchParams\.set\('entryId'/);
  assert.match(script, /renderContributor/);
  assert.match(script, /renderRecent/);
  assert.match(script, /contributorRosterStatus/);
  assert.match(script, /astro:page-load/);
  assert.match(script, /status === 'loading' \|\| status === 'loaded' \|\| status === 'error'/);
  assert.match(css, /\.contributor-roster/);
  assert.match(css, /\.contributor-roster--entry/);
  assert.match(css, /\.contributor-roster--summary/);
  assert.match(css, /\.contributor-roster__section/);
});

test('contributor sync script derives safe identities from git history', async () => {
  const script = await readProjectFile('../scripts/sync-contributors.mjs');
  const packageJson = JSON.parse(await readProjectFile('../package.json'));

  assert.equal(packageJson.scripts['contributors:sync'], 'node scripts/sync-contributors.mjs');
  assert.match(script, /src\/content\/artists/);
  assert.match(script, /src\/content\/site/);
  assert.match(script, /users\\\.noreply\\\.github\\\.com/);
  assert.match(script, /https:\/\/github\.com\/\$\{githubLogin\}\.png\?size=96/);
  assert.match(script, /emailHash/);
  assert.match(script, /api\/admin\/contributors\/sync/);
  assert.doesNotMatch(script, /email:\s*authorEmail/);
});
