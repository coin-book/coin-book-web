import type { Locale } from '@coin-book/core/i18n';

// The landing pages are plain HTML at build time, readable without JavaScript.
export const ssr = true;
export const prerender = true;

export function entries() {
  return [{}, { lang: 'sk' }, { lang: 'en' }];
}

export function load({ params }) {
  return { locale: (params.lang ?? 'cs') as Locale };
}
