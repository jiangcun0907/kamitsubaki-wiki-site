const storageKey = 'kamitsubaki-theme';
const preferences = new Set(['light', 'dark', 'system']);
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

const getPreference = () => {
  const preference = document.documentElement.dataset.themePreference;
  return preferences.has(preference) ? preference : 'system';
};

const resolveTheme = (preference) => {
  if (preference === 'system') return systemThemeQuery.matches ? 'dark' : 'light';
  return preference === 'light' ? 'light' : 'dark';
};

const updateOptions = (preference) => {
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    const selected = button.dataset.themeValue === preference;
    button.setAttribute('aria-checked', String(selected));
    button.classList.toggle('is-active', selected);
  });
};

const applyPreference = (preference, { persist = false } = {}) => {
  const nextPreference = preferences.has(preference) ? preference : 'system';
  document.documentElement.dataset.themePreference = nextPreference;
  document.documentElement.dataset.theme = resolveTheme(nextPreference);
  updateOptions(nextPreference);

  if (persist) {
    try {
      window.localStorage.setItem(storageKey, nextPreference);
    } catch {
      // The visual selector should still work when storage is unavailable.
    }
  }
};

const handleSystemThemeChange = () => {
  if (getPreference() === 'system') applyPreference('system');
};

document.addEventListener('DOMContentLoaded', () => {
  applyPreference(getPreference());

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element && event.target.closest('[data-theme-toggle]');
    if (!(button instanceof HTMLButtonElement)) return;

    applyPreference(button.dataset.themeValue, { persist: true });
  });

  if ('addEventListener' in systemThemeQuery) {
    systemThemeQuery.addEventListener('change', handleSystemThemeChange);
  } else {
    systemThemeQuery.addListener(handleSystemThemeChange);
  }
});
