import { describe, expect, it } from 'vitest';
import vectors from './format-vectors.json';
import { formatDecimal, formatGainPercent, formatMoney, formatPrice, formatWhole, parseMinor } from './money';

describe('formatMoney', () => {
  it.each(vectors)('matches the Go formatter for $minor $currency', (v) => {
    expect(formatMoney({ minor: v.minor, currency: v.currency })).toBe(v.formatted);
  });

  it('marks income with a plus when asked', () => {
    expect(formatMoney({ minor: 6200000, currency: 'CZK' }, { signed: true })).toBe('+62 000,00 Kč');
  });
});

describe('formatWhole', () => {
  it('rounds to whole units', () => {
    expect(formatWhole(-124950, 'CZK')).toBe('−1 250 Kč');
  });
});

describe('parseMinor', () => {
  it.each([
    ['1 250', 125000],
    ['1250,5', 125050],
    ['-89', -8900],
    ['0,05', 5],
  ])('parses %s', (input, minor) => {
    expect(parseMinor(input, 'CZK')).toBe(minor);
  });

  it.each(['', 'abc', '1,234,5', '1,234'])('rejects %s', (input) => {
    expect(parseMinor(input, 'CZK')).toBeNull();
  });
});

describe('formatDecimal', () => {
  it('groups thousands and drops trailing zeros', () => {
    expect(formatDecimal('1234.5000')).toBe('1\u00a0234,5');
    expect(formatDecimal('0.12345678')).toBe('0,12345678');
    expect(formatDecimal('5')).toBe('5');
    expect(formatDecimal('-2.5')).toBe('−2,5');
  });

  it('rounds half away from zero, carrying into the whole part', () => {
    expect(formatDecimal('1.81818182', 0, 4)).toBe('1,8182');
    expect(formatDecimal('9.99995', 0, 4)).toBe('10');
    expect(formatDecimal('999.96', 0, 1)).toBe('1\u00a0000');
    expect(formatDecimal('-0.00001', 0, 4)).toBe('0');
    expect(formatDecimal('2.5', 0, 0)).toBe('3');
  });
});

describe('formatPrice', () => {
  it('keeps two decimals and at most four', () => {
    expect(formatPrice('300', 'USD')).toBe('300,00\u00a0$');
    expect(formatPrice('12.34567', 'EUR')).toBe('12,3457\u00a0€');
  });
});

describe('formatGainPercent', () => {
  it('signs the share of the cost and needs a cost', () => {
    expect(formatGainPercent(414912, 1290088)).toBe('+32,2\u00a0%');
    expect(formatGainPercent(-1000, 26000)).toBe('−3,8\u00a0%');
    expect(formatGainPercent(5, 0)).toBe('');
  });
});
