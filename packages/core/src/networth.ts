import { todayISO } from './dates';
import type { NetWorthMonth } from './types';

export const assetClasses = [
  'cash',
  'savings',
  'investments',
  'p2p',
  'pension',
  'property',
  'other',
] as const;
export const debtClasses = ['mortgage', 'loan'] as const;

/** Fixed hue per class, so a class keeps its colour whatever else is held. */
export const classColor: Record<string, string> = {
  cash: 'laguna',
  savings: 'smaragd',
  investments: 'chrpa',
  p2p: 'mandarinka',
  pension: 'ametyst',
  property: 'kakao',
  other: 'bridlice',
  mortgage: 'malina',
  loan: 'slunecnice',
};

/** A value entered by hand older than this gets a hint to update it. */
const STALE_DAYS = 183;

export function isStale(valuedOn: string | null | undefined, today = todayISO()): boolean {
  if (!valuedOn) return false;
  return (Date.parse(today) - Date.parse(valuedOn)) / 86_400_000 > STALE_DAYS;
}

/** Whole months from today to an ISO day; negative once it has passed. */
export function monthsUntil(iso: string, today = todayISO()): number {
  const [y, m] = iso.split('-').map(Number);
  const [ty, tm] = today.split('-').map(Number);
  return (y - ty) * 12 + (m - tm);
}

/** Months of spending a reserve should cover: under the first it is thin, from the second it is ample. */
const RESERVE_LOW_MONTHS = 3;
const RESERVE_AMPLE_MONTHS = 6;

export type ReserveLevel = 'low' | 'ok' | 'ample';

export function reserveLevel(months: number): ReserveLevel {
  if (months < RESERVE_LOW_MONTHS) return 'low';
  return months < RESERVE_AMPLE_MONTHS ? 'ok' : 'ample';
}

/** How far the reserve is towards the ample level, 0 to 1. */
export function reserveProgress(months: number): number {
  return Math.min(1, Math.max(0, months / RESERVE_AMPLE_MONTHS));
}

export type RangeChange = {
  changeMinor: number;
  savedMinor: number;
  otherMinor: number;
  /** Relative to the net worth at the start; null when that was not positive. */
  share: number | null;
  /** Change per class, the ones that moved the most first; a debt paid down is positive. */
  byClass: { key: string; changeMinor: number }[];
};

/**
 * What changed since the baseline, the month before the range.
 * `months` is oldest first and includes the baseline as its first item.
 */
export function rangeChange(months: NetWorthMonth[]): RangeChange | null {
  if (months.length < 2) return null;
  const baseline = months[0];
  const last = months[months.length - 1];
  const changeMinor = last.total_czk.minor - baseline.total_czk.minor;
  const savedMinor = months.slice(1).reduce((sum, m) => sum + m.saved_czk.minor, 0);
  const before = new Map(baseline.by_class.map((c) => [c.key, c.value.minor]));
  const keys = new Set([...before.keys(), ...last.by_class.map((c) => c.key)]);
  const after = new Map(last.by_class.map((c) => [c.key, c.value.minor]));
  const byClass = [...keys]
    .map((key) => ({ key, changeMinor: (after.get(key) ?? 0) - (before.get(key) ?? 0) }))
    .filter((c) => c.changeMinor !== 0)
    .sort((a, b) => Math.abs(b.changeMinor) - Math.abs(a.changeMinor));
  const start = baseline.total_czk.minor;
  return {
    changeMinor,
    savedMinor,
    otherMinor: changeMinor - savedMinor,
    share: start > 0 ? changeMinor / start : null,
    byClass,
  };
}

/** Share of the principal paid off since the first terms, 0 to 1. */
export function repaidShare(originalMinor: number, balanceMinor: number): number {
  if (originalMinor <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - balanceMinor / originalMinor));
}
