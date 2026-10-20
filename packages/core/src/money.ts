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

const PRICE_MIN_DECIMALS = 2;
const PRICE_MAX_DECIMALS = 4;

/** A decimal string as the API sends prices and quantities: "1234.5" -> "1 234,5", rounded half away from zero. */
export function formatDecimal(value: string, minDecimals = 0, maxDecimals = 10): string {
  const negative = value.startsWith('-');
  let [whole, fraction = ''] = value.replace('-', '').split('.');
  if (fraction.length > maxDecimals) {
    const roundUp = fraction[maxDecimals] >= '5';
    fraction = fraction.slice(0, maxDecimals);
    if (roundUp) [whole, fraction] = incrementLastDigit(whole, fraction);
  }
  const shown = fraction.replace(/0+$/, '').padEnd(minDecimals, '0');
  const isZero = /^0*$/.test(whole + shown);
  return `${negative && !isZero ? MINUS : ''}${groupThousands(whole)}${shown ? ',' + shown : ''}`;
}

function incrementLastDigit(whole: string, fraction: string): [string, string] {
  const digits = (whole + fraction).split('').map(Number);
  let i = digits.length - 1;
  while (i >= 0 && digits[i] === 9) digits[i--] = 0;
  if (i >= 0) digits[i]++;
  const joined = (i < 0 ? '1' : '') + digits.join('');
  return [joined.slice(0, joined.length - fraction.length), joined.slice(joined.length - fraction.length)];
}

/** A price per share: two decimals, up to four when the quote has them. */
export function formatPrice(value: string, currency: string): string {
  return `${formatDecimal(value, PRICE_MIN_DECIMALS, PRICE_MAX_DECIMALS)}${NBSP}${currencyLabel(currency)}`;
}

/** A gain as a share of what was paid, "+32,2 %"; empty without a cost to measure against. */
export function formatGainPercent(gainMinor: number, costMinor: number): string {
  if (costMinor <= 0) return '';
  const value = (gainMinor / costMinor) * 100;
  return `${value > 0 ? '+' : ''}${formatDecimal(value.toFixed(1), 1, 1)}${NBSP}%`;
}

/** A percentage the API sends as a decimal, "10.46" -> "10,46 %". */
export function formatPercent(value: string, maxDecimals = 2): string {
  return `${formatDecimal(value, 0, maxDecimals)}${NBSP}%`;
}

/** A rate the API sends as a fraction, "0.0812" -> "+8,1 %". */
export function formatRate(fraction: string): string {
  const value = Number(fraction) * 100;
  return `${value > 0 ? '+' : ''}${formatDecimal(value.toFixed(1), 1, 1)}${NBSP}%`;
}
