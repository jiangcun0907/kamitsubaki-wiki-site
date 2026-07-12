import { nextThemePreference, normalizeThemePreference, resolveTheme } from '../lib/themePreference.mjs';

const storageKey = 'kamitsubaki-wiki:theme:v1';
const media = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(preference) {
  const normalized = normalizeThemePreference(preference);
  const resolved = resolveTheme(normalized, media.matches);
  document.documentElement.dataset.themePreference = normalized;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  return normalized;
}

function savedPreference() {
  try {
    return normalizeThemePreference(localStorage.getItem(storageKey));
  } catch {
    return 'system';
  }
}

function updateControl(root, preference) {
  const copy = JSON.parse(root.dataset.copy || '{}');
  const label = root.querySelector('[data-theme-toggle-label]');
  const button = root.querySelector('[data-theme-toggle-button]');
  if (label) label.textContent = copy[preference] || preference;
  if (button) {
    button.setAttribute('aria-label', `${copy.label || 'Theme'}: ${copy[preference] || preference}`);
    button.setAttribute('title', `${copy.label || 'Theme'}: ${copy[preference] || preference}`);
  }
  root.dataset.preference = preference;
}

function initializeThemeToggles() {
  const current = normalizeThemePreference(document.documentElement.dataset.themePreference || savedPreference());
  applyTheme(current);
  for (const root of document.querySelectorAll('[data-theme-toggle]')) {
    if (root.dataset.initialized === 'true') {
      updateControl(root, current);
      continue;
    }
    root.dataset.initialized = 'true';
    updateControl(root, current);
    root.querySelector('[data-theme-toggle-button]')?.addEventListener('click', () => {
      const next = nextThemePreference(document.documentElement.dataset.themePreference);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // Theme switching remains available when storage is blocked.
      }
      applyTheme(next);
      for (const control of document.querySelectorAll('[data-theme-toggle]')) updateControl(control, next);
    });
  }
}

media.addEventListener('change', () => {
  if (document.documentElement.dataset.themePreference === 'system') applyTheme('system');
});

initializeThemeToggles();
document.addEventListener('astro:page-load', initializeThemeToggles);
