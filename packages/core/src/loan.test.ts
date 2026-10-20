import { describe, expect, it } from 'vitest';
import { annuityMinor, instalmentsUntil } from './loan';

describe('annuity', () => {
  it('matches the API for a thirty-year mortgage', () => {
    expect(annuityMinor(3_000_000_00, 5, 360)).toBe(16_104_65);
  });

  it('splits evenly without interest', () => {
    expect(annuityMinor(12_000_00, 0, 12)).toBe(1_000_00);
  });

  it('counts the instalments to maturity', () => {
    expect(instalmentsUntil('2025-01-01', '2054-12-15', 15)).toBe(360);
    expect(instalmentsUntil('2025-01-15', '2054-12-15', 15)).toBe(359);
    expect(instalmentsUntil('2025-02-28', '2025-04-30', 31)).toBe(2);
  });
});
