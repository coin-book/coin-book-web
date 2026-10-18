import type { Locale } from '@coin-book/core/i18n';

export const SITE_URL = __SITE_URL__;

// An installation is someone's household server: it stays out of search engines unless
// the build names the public site it is.
export const indexable = SITE_URL !== '';

export const landingPaths: Record<Locale, string> = { cs: '/', sk: '/sk', en: '/en' };

export const ogLocales: Record<Locale, string> = { cs: 'cs_CZ', sk: 'sk_SK', en: 'en_GB' };

export function landingLocale(pathname: string): Locale | null {
  const found = Object.entries(landingPaths).find(([, path]) => path === pathname);
  return found ? (found[0] as Locale) : null;
}

export function absolute(path: string): string {
  return SITE_URL + path;
}
