import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readProjectFile(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('theme preferences normalize, resolve, and cycle predictably', async () => {
  const { nextThemePreference, normalizeThemePreference, resolveTheme } = await import('../src/lib/themePreference.mjs');

  assert.equal(normalizeThemePreference('light'), 'light');
  assert.equal(normalizeThemePreference('dark'), 'dark');
  assert.equal(normalizeThemePreference('system'), 'system');
  assert.equal(normalizeThemePreference('sepia'), 'system');
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(nextThemePreference('system'), 'light');
  assert.equal(nextThemePreference('light'), 'dark');
  assert.equal(nextThemePreference('dark'), 'system');
  assert.equal(nextThemePreference('invalid'), 'light');
});

test('base layout initializes the saved theme before paint and mounts localized controls', async () => {
  const [layout, component, script, schema, zh, ja, en] = await Promise.all([
    readProjectFile('../src/layouts/BaseLayout.astro'),
    readProjectFile('../src/components/ThemeToggle.astro'),
    readProjectFile('../src/scripts/themeToggle.js'),
    readProjectFile('../src/content.config.ts'),
    readProjectFile('../src/content/site/zh.json'),
    readProjectFile('../src/content/site/ja.json'),
    readProjectFile('../src/content/site/en.json'),
  ]);

  assert.match(layout, /kamitsubaki-wiki:theme:v1/);
  assert.match(layout, /localStorage\.getItem/);
  assert.match(layout, /matchMedia\('\(prefers-color-scheme: dark\)'\)/);
  assert.match(layout, /documentElement\.dataset\.theme/);
  assert.match(layout, /<ThemeToggle copy=\{themeToggleCopy\}/);
  assert.match(component, /data-theme-toggle/);
  assert.match(component, /aria-live="polite"/);
  assert.match(script, /nextThemePreference/);
  assert.match(script, /localStorage\.setItem/);
  assert.match(script, /addEventListener\('change'/);
  assert.match(schema, /themeToggle:/);
  assert.match(zh, /跟随系统/);
  assert.match(ja, /システム/);
  assert.match(en, /System/);
});

export { readProjectFile };
