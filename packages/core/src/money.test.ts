import { describe, expect, it } from 'vitest';
import vectors from './format-vectors.json';
import { formatMoney, formatWhole, parseMinor } from './money';

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
