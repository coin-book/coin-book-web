import { shortDate } from '@coin-book/core/dates';
import { t } from '@coin-book/core/i18n';
import { formatDecimal, formatWhole } from '@coin-book/core/money';
import { isStale, monthsUntil } from '@coin-book/core/networth';
import type { Wealth } from './wealth';

/** A fixation ending within this many months is worth looking at: banks offer refixation early. */
const FIXATION_HORIZON_MONTHS = 12;
const FIXATION_URGENT_MONTHS = 6;
/** Fewer months of spending than this available right away is a thin reserve. */
const LOW_RESERVE_MONTHS = 3;

export type AttentionItem = {
  key: string;
  /** warn: act soon; info: worth knowing. */
  level: 'warn' | 'info';
  icon: string;
  text: string;
  href: string;
};

/** What the user should look at, the urgent first. */
export function attentionItems(
  w: Wealth,
  accountName: (id: string) => string,
  triageCount: number,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const { account, loan } of w.loans) {
    const name = accountName(account.account_id);
    const href = `/net-worth/${account.account_id}`;
    if (!loan.current) {
      items.push({
        key: `terms-${account.account_id}`,
        level: 'warn',
        icon: 'house',
        href,
        text: t('attention.noTerms', { account: name }),
      });
      continue;
    }
    const fixedUntil = loan.current.fixed_until;
    const months = fixedUntil ? monthsUntil(fixedUntil) : null;
    if (fixedUntil && months !== null && months <= FIXATION_HORIZON_MONTHS) {
      items.push({
        key: `fixation-${account.account_id}`,
        level: months <= FIXATION_URGENT_MONTHS ? 'warn' : 'info',
        icon: 'calendar',
        href,
        text:
          months < 0
            ? t('attention.fixationOver', { account: name, date: shortDate(fixedUntil) })
            : t('attention.fixation', {
                account: name,
                date: shortDate(fixedUntil),
                months: Math.max(months, 0),
              }),
      });
    }
  }
  for (const { account, snapshot } of w.p2p) {
    if (snapshot.at_risk.minor > 0) {
      items.push({
        key: `risk-${account.account_id}`,
        level: 'warn',
        icon: 'warning',
        href: `/net-worth/${account.account_id}`,
        text: t('attention.atRisk', {
          account: accountName(account.account_id),
          amount: formatWhole(snapshot.at_risk.minor, snapshot.at_risk.currency),
        }),
      });
    }
  }
  for (const a of w.netWorth.accounts) {
    const href = `/net-worth/${a.account_id}`;
    if (a.valuation === 'snapshot' && a.unvalued) {
      items.push({
        key: `unvalued-${a.account_id}`,
        level: 'info',
        icon: 'pencil-simple',
        href,
        text: t('attention.unvalued', { account: accountName(a.account_id) }),
      });
    } else if (a.valuation === 'snapshot' && isStale(a.valued_on)) {
      items.push({
        key: `stale-${a.account_id}`,
        level: 'info',
        icon: 'pencil-simple',
        href,
        text: t('attention.stale', {
          account: accountName(a.account_id),
          date: shortDate(a.valued_on ?? ''),
        }),
      });
    }
  }
  if (triageCount > 0) {
    items.push({
      key: 'triage',
      level: 'info',
      icon: 'tray',
      href: '/triage',
      text: t('attention.triage', { count: triageCount }),
    });
  }
  if (w.ambiguousTransfers > 0) {
    items.push({
      key: 'ambiguous',
      level: 'info',
      icon: 'arrows-left-right',
      href: '/triage',
      text: t('attention.ambiguous', { count: w.ambiguousTransfers }),
    });
  }
  if (w.portfolio && w.portfolio.incomplete_history.length > 0) {
    items.push({
      key: 'incomplete',
      level: 'info',
      icon: 'chart-line-up',
      href: '/investments',
      text: t('attention.incomplete', {
        instruments: w.portfolio.incomplete_history.map((i) => i.ticker || i.isin).join(', '),
      }),
    });
  }
  const reserve = w.netWorth.reserve_months ? Number(w.netWorth.reserve_months) : null;
  if (reserve !== null && reserve < LOW_RESERVE_MONTHS) {
    items.push({
      key: 'reserve',
      level: 'warn',
      icon: 'piggy-bank',
      href: '/net-worth',
      text: t('attention.lowReserve', { months: formatDecimal(w.netWorth.reserve_months ?? '0', 0, 1) }),
    });
  }
  if (w.netWorth.unconverted.length > 0) {
    items.push({
      key: 'unconverted',
      level: 'info',
      icon: 'warning',
      href: '/net-worth',
      text: t('attention.unconverted', { currencies: w.netWorth.unconverted.join(', ') }),
    });
  }
  return items.sort((a, b) => (a.level === b.level ? 0 : a.level === 'warn' ? -1 : 1));
}
