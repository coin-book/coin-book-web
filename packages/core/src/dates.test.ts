import { describe, expect, it } from 'vitest';
import { currentMonth, monthName, shiftDay, shiftMonth, shortMonth, todayISO } from './dates';

describe('dates', () => {
  it('decides today in Europe/Prague', () => {
    expect(todayISO(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01');
    expect(currentMonth(new Date('2026-10-31T22:30:00Z'))).toBe('2026-10');
  });

  it('shifts months across a year', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('names months in the nominative', () => {
    expect(monthName('2026-10', 'cs')).toBe('Říjen 2026');
    expect(monthName('2026-10', 'sk')).toBe('Október 2026');
    expect(monthName('2026-10', 'en')).toBe('October 2026');
  });

  it('abbreviates June and July apart', () => {
    expect(shortMonth('2026-06', 'cs')).not.toBe(shortMonth('2026-07', 'cs'));
  });

  it('shifts days', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
  });
});
