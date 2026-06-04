import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const locales = ['zh', 'ja', 'en'];

async function fileExists(path) {
  try {
    await access(new URL(path, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

test('site has url-based zh ja en locales with Chinese as default', async () => {
  assert.equal(await fileExists('../src/pages/[locale]/index.astro'), true);
  assert.equal(await fileExists('../src/pages/index.astro'), true);

  const rootPage = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.match(rootPage, /\/zh\//);

  for (const locale of locales) {
    const site = await readJson(`../src/content/site/${locale}.json`);
    assert.equal(site.locale, locale);
    assert.equal(site.translationKey, 'home');
  }
});

test('localized content exists for key records in all supported locales', async () => {
  for (const locale of locales) {
    const artist = await readJson(`../src/content/artists/kaf.${locale}.json`);
    const project = await readJson(`../src/content/projects/kamitsubaki-city.${locale}.json`);
    const log = await readJson(`../src/content/logs/2024-06-01-vwp-live.${locale}.json`);

    assert.equal(artist.locale, locale);
    assert.equal(artist.translationKey, 'kaf');
    assert.equal(project.locale, locale);
    assert.equal(project.translationKey, 'kamitsubaki-city');
    assert.equal(log.locale, locale);
    assert.equal(log.translationKey, '2024-06-01-vwp-live');
  }
});

test('localized site config exposes language switcher labels and page chrome', async () => {
  const zh = await readJson('../src/content/site/zh.json');

  assert.equal(zh.defaultLocale, 'zh');
  assert.deepEqual(
    zh.supportedLocales.map((locale) => locale.code),
    locales,
  );
  assert.equal(zh.hero.title, 'Observer');
  assert.equal(zh.sections.database.heading, '01. DATABASE');
  assert.equal(zh.footer.disclaimer.length > 0, true);
});
