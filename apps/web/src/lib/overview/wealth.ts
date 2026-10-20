import { api, ApiError } from '@coin-book/core/api';
import type {
  AccountValue,
  AmbiguousTransfer,
  LoanOverview,
  NetWorth,
  NetWorthMonth,
  P2PSnapshot,
  Portfolio,
} from '@coin-book/core/types';

const TREND_MONTHS = 12;

/** Everything the overview tells about what the user owns and owes, as of today. */
export type Wealth = {
  netWorth: NetWorth;
  trend: NetWorthMonth[];
  /** Null without any investments imported. */
  portfolio: Portfolio | null;
  loans: { account: AccountValue; loan: LoanOverview }[];
  p2p: { account: AccountValue; snapshot: P2PSnapshot }[];
  ambiguousTransfers: number;
};

// A platform without an imported export, or no investments at all, answers 404 or an empty
// portfolio; for the overview that is nothing to show rather than an error.
export async function optional<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function loadWealth(): Promise<Wealth> {
  const [netWorth, trend, portfolio, ambiguous] = await Promise.all([
    api.get<NetWorth>('/reports/net-worth'),
    api.get<{ months: NetWorthMonth[] }>('/reports/net-worth/history', { months: TREND_MONTHS }),
    api.get<Portfolio>('/investments/portfolio'),
    api.get<{ ambiguous: AmbiguousTransfer[] }>('/transfers/ambiguous'),
  ]);
  const loanAccounts = netWorth.accounts.filter((a) => a.valuation === 'schedule');
  const p2pAccounts = netWorth.accounts.filter((a) => a.class === 'p2p');
  const [loans, p2p] = await Promise.all([
    Promise.all(
      loanAccounts.map(async (account) => ({
        account,
        loan: await api.get<LoanOverview>(`/loans/${account.account_id}`),
      })),
    ),
    Promise.all(
      p2pAccounts.map(async (account) => ({
        account,
        snapshot: await optional(api.get<P2PSnapshot>(`/accounts/${account.account_id}/p2p-loans`)),
      })),
    ),
  ]);
  return {
    netWorth,
    trend: trend.months,
    portfolio: portfolio.positions.length > 0 ? portfolio : null,
    loans,
    p2p: p2p.filter((p): p is { account: AccountValue; snapshot: P2PSnapshot } => p.snapshot !== null),
    ambiguousTransfers: ambiguous.ambiguous.length,
  };
}
