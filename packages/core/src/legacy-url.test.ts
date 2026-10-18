import { describe, expect, it } from 'vitest';
import { legacyUrl } from './legacy-url';

const at = (path: string) => legacyUrl(new URL(path, 'https://coin-book.example'));

describe('legacyUrl', () => {
  it('maps Czech paths and parameters to English ones', () => {
    expect(at('/prehled?mesic=2026-10&graf=kategorie')).toBe('/overview?month=2026-10&chart=categories');
    expect(at('/transakce?ucet=a&kategorie=b&od=2026-10-01&do=2026-10-31&nezarazene=1')).toBe(
      '/transactions?account=a&category=b&from=2026-10-01&to=2026-10-31&uncategorized=1',
    );
    expect(at('/rozpocet/2026-11')).toBe('/budget/2026-11');
    expect(at('/investice/US0378331005')).toBe('/investments/US0378331005');
    expect(at('/investice?seskupit=ne&zalozka=test')).toBe('/investments?group=none&tab=time-test');
    expect(at('/k-vyreseni')).toBe('/triage');
  });

  it('leaves current URLs alone', () => {
    expect(at('/overview?month=2026-10')).toBeNull();
    expect(at('/login')).toBeNull();
  });
});
