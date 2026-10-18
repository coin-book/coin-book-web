import { cs, type MessageKey } from './i18n/cs';

export type { MessageKey };
import { en } from './i18n/en';
import { sk } from './i18n/sk';
import { errorMessages } from './i18n/errors';

export type Locale = 'cs' | 'sk' | 'en';

export const locales: Locale[] = ['cs', 'sk', 'en'];

const LOCALE_KEY = 'coinbook.locale';

const dictionaries: Record<Locale, Record<MessageKey, string>> = { cs, sk, en };

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (locales.includes(stored as Locale)) return stored as Locale;
  } catch {
    // Storage blocked: fall through to the browser's languages.
  }
  const spoken = (navigator.languages ?? []).map((l) => l.slice(0, 2)) as Locale[];
  return spoken.find((l) => locales.includes(l)) ?? 'cs';
}

class I18n {
  locale = $state<Locale>(typeof localStorage === 'undefined' ? 'cs' : initialLocale());

  set(locale: Locale) {
    this.locale = locale;
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      // Not remembered, still switched.
    }
    document.documentElement.lang = locale;
  }

  get intlLocale(): string {
    return { cs: 'cs-CZ', sk: 'sk-SK', en: 'en-GB' }[this.locale];
  }
}

export const i18n = new I18n();

export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  return translate(i18n.locale, key, params);
}

/** Translates in a locale the page dictates, such as a landing page's own language. */
export function translate(
  locale: Locale,
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  const template = dictionaries[locale][key] ?? cs[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
}

/** Czech and Slovak share the 1 / 2–4 / 5+ plural rule; English has no "few", so its few and many read the same. */
export function pluralKey(n: number): 'one' | 'few' | 'many' {
  if (n === 1) return 'one';
  if (n >= 2 && n <= 4) return 'few';
  return 'many';
}

export function daysWord(n: number): string {
  return t(`days.${pluralKey(n)}` as MessageKey);
}

export function apiErrorMessage(code: string): string {
  return errorMessages[i18n.locale][code] ?? errorMessages[i18n.locale].internal_error;
}

export function categoryName(c: { name_cs: string; name_sk: string; name_en: string }): string {
  return { cs: c.name_cs, sk: c.name_sk, en: c.name_en }[i18n.locale];
}
