import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import yaml from 'yaml';

import { getLocalizedSiteName, localizedSiteNames } from '../src/lib/i18n.mjs';

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

async function readMd(path) {
  const content = await readFile(new URL(path, import.meta.url), 'utf8');
  const match = content.match(/---\r?\n([\s\S]*?)\r?\n---/);
  return yaml.parse(match[1]);
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

test('site name is localized across Chinese, Japanese, and English', () => {
  assert.deepEqual(localizedSiteNames, {
    zh: '神椿观测站-KAMITSUBAKI Fan Wiki',
    ja: '神椿観測所-KAMITSUBAKI Fan Wiki',
    en: 'KAMITSUBAKI Observatory-KAMITSUBAKI Fan Wiki',
  });
  assert.equal(getLocalizedSiteName('unknown'), localizedSiteNames.zh);
});

test('localized content exists for key records in all supported locales', async () => {
  for (const locale of locales) {
    const artist = await readMd(`../src/content/artists/vwp/kaf/${locale}.md`);
    const project = await readMd(`../src/content/projects/arg/kamitsubaki-city/${locale}.md`);
    const log = await readMd(`../src/content/logs/2024/2024-06-01-vwp-live/${locale}.md`);

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

test('localized site config exposes configurable social contact links', async () => {
  for (const locale of locales) {
    const site = await readJson(`../src/content/site/${locale}.json`);
    const contactLink = site.footer.links.find((link) => link.label === 'CONTACT');

    assert.equal(contactLink.href, `/${locale}/#social-contact`);
    assert.equal(site.socialContact.enabled, true);
    assert.deepEqual(
      site.socialContact.items.slice(0, 3).map((item) => item.icon),
      ['qq', 'link', 'discord'],
    );
    assert.equal(
      site.socialContact.items.find((item) => item.icon === 'github')?.href,
      'https://github.com/LinkTh1rsty',
    );
    assert.equal(site.socialContact.items.every((item) => item.href && item.enabled !== false), true);
  }
});
