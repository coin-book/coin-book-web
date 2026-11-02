import { currencyLabel, exponent, formatDecimal } from './money';
import type { Amount } from './types';

const DAY_MS = 86_400_000;

export type CounterpartCandidate = { id: string; bookedOn: string; numberMatches: boolean };

/** The candidate that clearly beats the others; undefined when two are equally likely or there is no choice. */
export function recommendedCounterpart(
  legBookedOn: string,
  candidates: CounterpartCandidate[],
): string | undefined {
  if (candidates.length < 2) return undefined;
  const byNumber = candidates.filter((c) => c.numberMatches);
  const pool = byNumber.length > 0 ? byNumber : candidates;
  const distance = (c: CounterpartCandidate) =>
    Math.abs(Date.parse(c.bookedOn) - Date.parse(legBookedOn)) / DAY_MS;
  const closest = Math.min(...pool.map(distance));
  const nearest = pool.filter((c) => distance(c) === closest);
  return nearest.length === 1 ? nearest[0].id : undefined;
}

type Leg = { id: string; transfer?: { counterpart_tx_id?: string | null } | null };

/** A leg whose counterpart is not listed (filtered out, or on a page not loaded yet) stays on its own. */
export function groupTransferPairs<T extends Leg>(listed: T[]): T[][] {
  const byId = new Map(listed.map((tx) => [tx.id, tx]));
  const placed = new Set<string>();
  const groups: T[][] = [];
  for (const tx of listed) {
    if (placed.has(tx.id)) continue;
    placed.add(tx.id);
    const counterpartId = tx.transfer?.counterpart_tx_id;
    const counterpart = counterpartId ? byId.get(counterpartId) : undefined;
    if (!counterpart || placed.has(counterpart.id)) {
      groups.push([tx]);
      continue;
    }
    placed.add(counterpart.id);
    groups.push([tx, counterpart]);
  }
  return groups;
}

const RATE_DECIMALS = 4;
const RATE_MIN_DECIMALS = 2;

/** The rate two legs in different currencies imply, "1 € = 25,10 Kč", the stronger currency first; empty for one currency. */
export function impliedRate(a: Amount, b: Amount): string {
  if (a.currency === b.currency || a.minor === 0 || b.minor === 0) return '';
  const units = (m: Amount) => Math.abs(m.minor) / 10 ** exponent(m.currency);
  const [unit, quote] = units(a) <= units(b) ? [a, b] : [b, a];
  const rate = (units(quote) / units(unit)).toFixed(RATE_DECIMALS);
  return `1\u00a0${currencyLabel(unit.currency)} = ${formatDecimal(rate, RATE_MIN_DECIMALS, RATE_DECIMALS)}\u00a0${currencyLabel(quote.currency)}`;
}
