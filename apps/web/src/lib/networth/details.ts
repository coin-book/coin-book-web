import { api } from '@coin-book/core/api';
import type { AccountPerformance, AccountValue, LoanOverview, P2PSnapshot } from '@coin-book/core/types';
import { optional } from '../overview/wealth';

/** What a balance sheet row tells beyond its value, by account id. */
export type AccountDetails = {
  loans: Map<string, LoanOverview>;
  performance: Map<string, AccountPerformance>;
  p2p: Map<string, P2PSnapshot>;
};

/** Classes whose return is worth showing: a home is valued, not invested into. */
const classesWithReturn = new Set(['p2p', 'pension', 'other']);

export function emptyDetails(): AccountDetails {
  return { loans: new Map(), performance: new Map(), p2p: new Map() };
}

export async function loadAccountDetails(accounts: AccountValue[]): Promise<AccountDetails> {
  const byId = <T>(entries: [string, T | null][]) =>
    new Map(entries.filter((e): e is [string, T] => e[1] !== null));
  const [loans, performance, p2p] = await Promise.all([
    Promise.all(
      accounts
        .filter((a) => a.valuation === 'schedule' && !a.unvalued)
        .map(
          async (a) =>
            [a.account_id, await optional(api.get<LoanOverview>(`/loans/${a.account_id}`))] as [
              string,
              LoanOverview | null,
            ],
        ),
    ),
    Promise.all(
      accounts
        .filter((a) => a.valuation === 'snapshot' && !a.unvalued && classesWithReturn.has(a.class))
        .map(
          async (a) =>
            [
              a.account_id,
              await optional(api.get<AccountPerformance>(`/accounts/${a.account_id}/performance`)),
            ] as [string, AccountPerformance | null],
        ),
    ),
    Promise.all(
      accounts
        .filter((a) => a.class === 'p2p')
        .map(
          async (a) =>
            [a.account_id, await optional(api.get<P2PSnapshot>(`/accounts/${a.account_id}/p2p-loans`))] as [
              string,
              P2PSnapshot | null,
            ],
        ),
    ),
  ]);
  return { loans: byId(loans), performance: byId(performance), p2p: byId(p2p) };
}
