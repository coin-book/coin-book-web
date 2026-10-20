import { describe, expect, it } from 'vitest';
import { isStale, monthsUntil, rangeChange, repaidShare, reserveLevel, reserveProgress } from './networth';
import type { NetWorthMonth } from './types';

function month(
  key: string,
  totalMinor: number,
  savedMinor: number,
  byClass: Record<string, number>,
): NetWorthMonth {
  const czk = (minor: number) => ({ minor, currency: 'CZK' });
  return {
    month: key,
    on: `${key}-28`,
    total_czk: czk(totalMinor),
    assets_czk: czk(0),
    liabilities_czk: czk(0),
    change_czk: czk(0),
    saved_czk: czk(savedMinor),
    other_change_czk: czk(0),
    by_class: Object.entries(byClass).map(([k, v]) => ({ key: k, value: czk(v) })),
  };
}

describe('net worth helpers', () => {
  it('calls a value older than half a year stale', () => {
    expect(isStale('2026-01-01', '2026-10-19')).toBe(true);
    expect(isStale('2026-06-01', '2026-10-19')).toBe(false);
    expect(isStale(undefined, '2026-10-19')).toBe(false);
  });

  it('counts months to a day', () => {
    expect(monthsUntil('2028-06-01', '2026-10-19')).toBe(20);
    expect(monthsUntil('2026-09-01', '2026-10-19')).toBe(-1);
  });

  it('rates the reserve against three and six months of spending', () => {
    expect(reserveLevel(1.4)).toBe('low');
    expect(reserveLevel(3)).toBe('ok');
    expect(reserveLevel(6)).toBe('ample');
    expect(reserveProgress(1.5)).toBe(0.25);
    expect(reserveProgress(9)).toBe(1);
  });

  it('splits the change since the baseline into savings, the rest and classes', () => {
    const change = rangeChange([
      month('2026-07', 1000, 999, { cash: 300, mortgage: -800, property: 1500 }),
      month('2026-08', 1100, 50, { cash: 350, mortgage: -790, property: 1540 }),
      month('2026-09', 1300, 70, { cash: 420, mortgage: -780, property: 1660 }),
    ]);
    expect(change).toEqual({
      changeMinor: 300,
      savedMinor: 120,
      otherMinor: 180,
      share: 0.3,
      byClass: [
        { key: 'property', changeMinor: 160 },
        { key: 'cash', changeMinor: 120 },
        { key: 'mortgage', changeMinor: 20 },
      ],
    });
  });

  it('needs a baseline and a month to tell a change', () => {
    expect(rangeChange([month('2026-09', 1, 0, {})])).toBeNull();
    expect(rangeChange([month('2026-08', -5, 0, {}), month('2026-09', 5, 0, {})])?.share).toBeNull();
  });

  it('measures how much of a loan is paid off', () => {
    expect(repaidShare(4_200_000, 3_966_740)).toBeCloseTo(0.0555, 3);
    expect(repaidShare(0, 10)).toBe(0);
  });
});
