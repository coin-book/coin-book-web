import type { Amount } from './types';

const MINUS = '−';
const NBSP = ' ';

const zeroDecimal = new Set(['JPY', 'KRW', 'ISK']);

const labels: Record<string, string> = { CZK: 'Kč', EUR: '€', USD: '$' };

export function exponent(currency: string): number {
  return zeroDecimal.has(currency) ? 0 : 2;
}

export function currencyLabel(currency: string): string {
  return labels[currency] ?? currency;
}

export interface MoneyParts {
  sign: '' | '+' | typeof MINUS;
  whole: string;
  fraction: string;
  currency: string;
}

/** Splits an amount for display; twin of coin-book-api/internal/platform/money/format.go. */
export function moneyParts(amount: Amount, { signed = false } = {}): MoneyParts {
  const exp = exponent(amount.currency);
  const negative = amount.minor < 0;
  const digits = Math.abs(amount.minor)
    .toString()
    .padStart(exp + 1, '0');
  const whole = digits.slice(0, digits.length - exp);
  return {
    sign: negative ? MINUS : signed && amount.minor > 0 ? '+' : '',
    whole: groupThousands(whole),
    fraction: exp > 0 ? digits.slice(digits.length - exp) : '',
    currency: currencyLabel(amount.currency),
  };
}

export function formatMoney(amount: Amount, options?: { signed?: boolean }): string {
  const p = moneyParts(amount, options);
  return `${p.sign}${p.whole}${p.fraction ? ',' + p.fraction : ''}${NBSP}${p.currency}`;
}

/** Whole units only, for budgets and charts where haléře are noise. */
export function formatWhole(minor: number, currency: string): string {
  const units = Math.sign(minor) * Math.round(Math.abs(minor) / 10 ** exponent(currency));
  const sign = units < 0 ? MINUS : '';
  return `${sign}${groupThousands(Math.abs(units).toString())}${NBSP}${currencyLabel(currency)}`;
}

function groupThousands(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** Parses what a person types into an amount field: "1 250", "1250,5", "-89". */
export function parseMinor(input: string, currency: string): number | null {
  const cleaned = input.replace(/[\s ]/g, '').replace(MINUS, '-').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const exp = exponent(currency);
  const [whole, fraction = ''] = cleaned.replace('-', '').split('.');
  if (fraction.length > exp) return null;
  const minor = Number(whole + fraction.padEnd(exp, '0'));
  return cleaned.startsWith('-') ? -minor : minor;
}
