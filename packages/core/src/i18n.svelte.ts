import { cs, type MessageKey } from './i18n/cs';

export type { MessageKey };
import { sk } from './i18n/sk';
import { errorMessages } from './i18n/errors';

export type Locale = 'cs' | 'sk';

const LOCALE_KEY = 'coinbook.locale';

const dictionaries: Record<Locale, Record<MessageKey, string>> = { cs, sk };

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === 'cs' || stored === 'sk') return stored;
  } catch {
    // Storage blocked: fall through to the default.
  }
  return 'cs';
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
    return this.locale === 'sk' ? 'sk-SK' : 'cs-CZ';
  }
}

export const i18n = new I18n();

export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  const template = dictionaries[i18n.locale][key] ?? cs[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
}

/** Czech and Slovak share the 1 / 2–4 / 5+ plural rule. */
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

export function categoryName(c: { name_cs: string; name_sk: string }): string {
  return i18n.locale === 'sk' ? c.name_sk : c.name_cs;
}
