export const supportedLocales = ['zh', 'ja', 'en'];
export const defaultLocale = 'zh';

export function isSupportedLocale(locale) {
  return supportedLocales.includes(locale);
}

export function buildLocaleLinks(siteContent, currentLocale, currentPath = '/') {
  return siteContent.supportedLocales.map((locale) => ({
    ...locale,
    href: `/${locale.code}${currentPath}`,
    current: locale.code === currentLocale,
  }));
}
