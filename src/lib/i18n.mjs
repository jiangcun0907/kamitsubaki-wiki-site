export const supportedLocales = ['zh', 'ja', 'en'];
export const defaultLocale = 'zh';

export function isSupportedLocale(locale) {
  return supportedLocales.includes(locale);
}

export function buildLocaleLinks(siteContent, currentLocale) {
  return siteContent.supportedLocales.map((locale) => ({
    ...locale,
    href: `/${locale.code}/`,
    current: locale.code === currentLocale,
  }));
}
