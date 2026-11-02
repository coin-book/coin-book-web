import { describe, expect, it } from 'vitest';
import { groupTransferPairs, impliedRate, recommendedCounterpart } from './transfers';

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

describe('groupTransferPairs', () => {
  const leg = (id: string, counterpart?: string | null) => ({
    id,
    transfer: counterpart === undefined ? undefined : { counterpart_tx_id: counterpart },
  });
  const ids = (groups: { id: string }[][]) => groups.map((g) => g.map((tx) => tx.id));

  it('moves the counterpart next to the leg listed first', () => {
    expect(ids(groupTransferPairs([leg('out', 'in'), leg('coffee'), leg('in', 'out')]))).toEqual([
      ['out', 'in'],
      ['coffee'],
    ]);
  });

  it('keeps a leg alone when its counterpart is not listed', () => {
    expect(ids(groupTransferPairs([leg('out', 'elsewhere'), leg('coffee')]))).toEqual([['out'], ['coffee']]);
  });

  it('keeps a one-sided transfer alone', () => {
    expect(ids(groupTransferPairs([leg('top-up', null)]))).toEqual([['top-up']]);
  });
});

describe('impliedRate', () => {
  it('quotes the stronger currency in the weaker one', () => {
    expect(impliedRate({ minor: -250000, currency: 'CZK' }, { minor: 9960, currency: 'EUR' })).toBe(
      '1\u00a0€ = 25,1004\u00a0Kč',
    );
    expect(impliedRate({ minor: 10000, currency: 'EUR' }, { minor: -250000, currency: 'CZK' })).toBe(
      '1\u00a0€ = 25,00\u00a0Kč',
    );
  });

  it('is empty for one currency', () => {
    expect(impliedRate({ minor: -100, currency: 'CZK' }, { minor: 100, currency: 'CZK' })).toBe('');
  });
});
