import { describe, expect, it } from 'vitest';
import { recommendedCounterpart } from './transfers';

describe('recommendedCounterpart', () => {
  it('prefers the same day over a later one', () => {
    expect(
      recommendedCounterpart('2026-08-20', [
        { id: 'next-day', bookedOn: '2026-08-21', numberMatches: false },
        { id: 'same-day', bookedOn: '2026-08-20', numberMatches: false },
      ]),
    ).toBe('same-day');
  });

  it('prefers a matching account number over a closer date', () => {
    expect(
      recommendedCounterpart('2026-08-20', [
        { id: 'same-day', bookedOn: '2026-08-20', numberMatches: false },
        { id: 'named', bookedOn: '2026-08-22', numberMatches: true },
      ]),
    ).toBe('named');
  });

  it('recommends none of two equally distant movements', () => {
    expect(
      recommendedCounterpart('2026-08-20', [
        { id: 'before', bookedOn: '2026-08-19', numberMatches: false },
        { id: 'after', bookedOn: '2026-08-21', numberMatches: false },
      ]),
    ).toBeUndefined();
  });

  it('recommends nothing when there is no choice', () => {
    expect(
      recommendedCounterpart('2026-08-20', [{ id: 'only', bookedOn: '2026-08-25', numberMatches: false }]),
    ).toBeUndefined();
  });
});
