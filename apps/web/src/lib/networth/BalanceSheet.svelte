<script lang="ts">
  import { shortDate } from '@coin-book/core/dates';
  import { t, type MessageKey } from '@coin-book/core/i18n';
  import { formatPercent, formatRate, formatWhole } from '@coin-book/core/money';
  import {
    assetClasses,
    classColor,
    debtClasses,
    isStale,
    monthsUntil,
    repaidShare,
  } from '@coin-book/core/networth';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import type { AccountValue, LoanOverview, NetWorth } from '@coin-book/core/types';
  import Icon from '@coin-book/ui/Icon.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import ValuationForm from '$lib/ValuationForm.svelte';
  import type { AccountDetails } from './details';

  type Props = { summary: NetWorth; details: AccountDetails; onvalued: () => void };
  let { summary, details, onvalued }: Props = $props();

  const CZK = 'CZK';
  /** A fixation ending this soon is flagged on the loan's row: banks offer refixation months ahead. */
  const FIXATION_HORIZON_MONTHS = 12;

  let valuing = $state<string | null>(null);

  const assets = $derived(summary.assets_czk.minor);

  function classTotal(key: string) {
    return summary.by_class.find((c) => c.key === key)?.value.minor ?? 0;
  }

  function groups(classes: readonly string[]) {
    const byClass = new Map<string, AccountValue[]>();
    for (const a of summary.accounts) {
      if (!classes.includes(a.class)) continue;
      if (!byClass.has(a.class)) byClass.set(a.class, []);
      byClass.get(a.class)!.push(a);
    }
    return classes
      .filter((c) => byClass.has(c))
      .map((c) => ({
        key: c,
        total: classTotal(c),
        accounts: byClass
          .get(c)!
          .sort((x, y) => Math.abs(y.value_czk?.minor ?? 0) - Math.abs(x.value_czk?.minor ?? 0)),
      }));
  }

  const assetGroups = $derived(groups(assetClasses));
  const debtGroups = $derived(groups(debtClasses));

  const equity = $derived.by(() => {
    const property = classTotal('property');
    const mortgage = -classTotal('mortgage');
    if (property <= 0 || mortgage <= 0) return null;
    return { minor: property - mortgage, share: Math.max(0, (property - mortgage) / property) };
  });

  function accountName(id: string) {
    return taxonomy.accountsById.get(id)?.name ?? '';
  }

  function detailHref(a: AccountValue) {
    switch (a.valuation) {
      case 'snapshot':
      case 'schedule':
        return `/net-worth/${a.account_id}`;
      case 'flows':
        return `/net-worth/${taxonomy.accountsById.get(a.account_id)?.parent_id ?? a.account_id}`;
      case 'market':
        return '/investments';
      default:
        return `/transactions?account=${a.account_id}`;
    }
  }

  function share(minor: number) {
    if (assets <= 0) return '';
    const value = (Math.abs(minor) / assets) * 100;
    return value < 1 ? '< 1' : String(Math.round(value));
  }

  function reserveLoan(a: AccountValue): LoanOverview | undefined {
    return [...details.loans.values()].find((l) => l.reserve?.account_id === a.account_id);
  }

  function originalBalance(loan: LoanOverview) {
    const first = [...loan.terms].sort((x, y) => x.valid_from.localeCompare(y.valid_from))[0];
    return first?.balance.minor ?? 0;
  }

  function fixationMonths(loan: LoanOverview) {
    const until = loan.current?.fixed_until;
    return until ? monthsUntil(until) : null;
  }
</script>

{#snippet row(a: AccountValue)}
  {@const loan = details.loans.get(a.account_id)}
  {@const performance = details.performance.get(a.account_id)}
  {@const p2p = details.p2p.get(a.account_id)}
  {@const reserveOf = a.valuation === 'flows' ? reserveLoan(a) : undefined}
  <li data-testid="net-worth-account" data-account={a.account_id}>
    <div class="main">
      <a class="name" href={detailHref(a)}>{accountName(a.account_id)}</a>
      <span class="sub">
        {#if a.unvalued}
          <span class="badge"
            >{a.valuation === 'schedule' ? t('netWorth.noTerms') : t('netWorth.unvalued')}</span
          >
        {:else if loan?.current}
          <span>{t('netWorth.loanRate', { rate: formatPercent(loan.current.annual_rate) })}</span>
          <span
            >{t('netWorth.loanPayment', {
              amount: formatWhole(loan.current.payment.minor, loan.current.payment.currency),
            })}</span
          >
          {#if loan.current.fixed_until}
            <span>{t('netWorth.fixedUntil', { date: shortDate(loan.current.fixed_until) })}</span>
          {/if}
          {#if loan.paid_off_on}<span>{t('netWorth.loanPaidOff', { date: shortDate(loan.paid_off_on) })}</span
            >{/if}
        {:else if reserveOf?.reserve}
          <span
            >{t('netWorth.reserveOf', {
              amount: formatWhole(reserveOf.reserve.saves.minor, reserveOf.reserve.saves.currency),
            })}</span
          >
        {:else if a.valued_on}
          <span>{t('netWorth.valuedOn', { date: shortDate(a.valued_on) })}</span>
        {:else}
          <span>{t(`netWorth.method.${a.valuation}` as MessageKey)}</span>
        {/if}
        {#if performance?.annual_return}
          <span class="good"
            >{t('netWorth.annualReturn', { rate: formatRate(performance.annual_return) })}</span
          >
        {/if}
        {#if p2p && p2p.at_risk.minor > 0}
          <span class="badge warn"
            ><Icon name="warning" size={13} />
            {t('netWorth.atRisk', { amount: formatWhole(p2p.at_risk.minor, p2p.at_risk.currency) })}</span
          >
        {/if}
        {#if a.valuation === 'snapshot' && isStale(a.valued_on)}
          <span class="badge warn"><Icon name="warning" size={13} /> {t('netWorth.stale')}</span>
        {/if}
        {#if a.valuation === 'snapshot'}
          <button
            type="button"
            class="add-value"
            aria-expanded={valuing === a.account_id}
            onclick={() => (valuing = valuing === a.account_id ? null : a.account_id)}
            ><Icon name="pencil-simple" size={13} /> {t('netWorth.addValue')}</button
          >
        {/if}
        {#if loan}
          {@const months = fixationMonths(loan)}
          {#if months !== null && months <= FIXATION_HORIZON_MONTHS}
            <span class="badge warn"
              ><Icon name="calendar" size={13} />
              {months < 0 ? t('netWorth.fixationOver') : t('netWorth.fixationSoon', { months })}</span
            >
          {/if}
        {/if}
      </span>
      {#if loan?.current}
        {@const repaid = repaidShare(originalBalance(loan), loan.balance.minor)}
        <span class="repaid">
          <span class="track" aria-hidden="true"
            ><i style="width: {repaid * 100}%; background: var(--cat-{classColor[a.class]})"></i></span
          >
          <span class="quiet small">{t('netWorth.repaid', { share: Math.round(repaid * 100) })}</span>
        </span>
      {/if}
    </div>
    <div class="value">
      {#if a.value_czk}
        <MoneyAmount amount={{ ...a.value_czk, minor: Math.abs(a.value_czk.minor) }} whole />
      {/if}
      {#if a.value.currency !== CZK && a.valuation !== 'market'}
        <span class="quiet small"
          ><MoneyAmount amount={{ ...a.value, minor: Math.abs(a.value.minor) }} whole /></span
        >
      {/if}
      {#if a.value_czk && a.value_czk.minor > 0 && share(a.value_czk.minor)}
        <span class="quiet small">{t('netWorth.shareOfAssets', { share: share(a.value_czk.minor) })}</span>
      {/if}
    </div>
    {#if valuing === a.account_id}
      <div class="drawer">
        <ValuationForm
          accountId={a.account_id}
          currency={a.value.currency}
          onsaved={() => {
            valuing = null;
            onvalued();
          }}
        />
      </div>
    {/if}
  </li>
{/snippet}

{#snippet column(title: string, total: number, list: ReturnType<typeof groups>)}
  <div class="column">
    <div class="column-head">
      <h3>{title}</h3>
      <MoneyAmount amount={{ minor: Math.abs(total), currency: CZK }} size="lg" whole />
    </div>
    {#each list as group (group.key)}
      <div class="group">
        <div class="group-head">
          <span class="swatch" style="background: var(--cat-{classColor[group.key]})" aria-hidden="true"
          ></span>
          <h4>{t(`netWorth.class.${group.key}` as MessageKey)}</h4>
          <MoneyAmount amount={{ minor: Math.abs(group.total), currency: CZK }} whole />
        </div>
        <ul>
          {#each group.accounts as a (a.account_id)}
            {@render row(a)}
          {/each}
        </ul>
      </div>
    {/each}
  </div>
{/snippet}

<section class="panel" data-testid="net-worth-accounts">
  <h2>{t('netWorth.balanceSheet')}</h2>
  <p class="quiet small lead">{t('netWorth.balanceSheetLead')}</p>
  <div class="sheet">
    {@render column(t('netWorth.assets'), summary.assets_czk.minor, assetGroups)}
    <div class="debts">
      {@render column(t('netWorth.liabilities'), summary.liabilities_czk.minor, debtGroups)}
      {#if debtGroups.length === 0}
        <p class="quiet">{t('netWorth.noDebts')}</p>
      {/if}
      {#if equity}
        <div class="equity" data-testid="equity">
          <h4>{t('netWorth.equity')}</h4>
          <MoneyAmount amount={{ minor: equity.minor, currency: CZK }} size="lg" whole />
          <span class="track" aria-hidden="true"
            ><i style="width: {equity.share * 100}%; background: var(--brand)"></i></span
          >
          <p class="quiet small">{t('netWorth.equityLead', { share: Math.round(equity.share * 100) })}</p>
        </div>
      {/if}
    </div>
  </div>
  <div class="net">
    <span>{t('netWorth.netLine')}</span>
    <strong>{t('netWorth.total')}</strong>
    <MoneyAmount amount={summary.total_czk} size="lg" whole />
  </div>
</section>

<style>
  .panel {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 22px 24px;
    margin-bottom: 18px;
  }
  h2 {
    margin: 0;
    font-size: var(--text-body);
    font-weight: 650;
    color: var(--ink-soft);
  }
  .lead {
    margin: 2px 0 14px;
  }
  .sheet {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 32px;
  }
  .column-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--line);
  }
  h3 {
    margin: 0;
    font-size: var(--text-title);
    font-weight: 700;
  }
  h4 {
    margin: 0;
    font-size: var(--text-body);
    font-weight: 650;
  }
  .group {
    margin-top: 14px;
  }
  .group-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }
  .group-head h4 {
    flex: 1;
  }
  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 4px 14px;
    padding: 10px 0 10px 18px;
    border-top: 1px solid var(--line);
  }
  .add-value {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 8px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in oklch, var(--brand) 10%, transparent);
    color: var(--brand);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .add-value:hover,
  .add-value[aria-expanded='true'] {
    background: color-mix(in oklch, var(--brand) 18%, transparent);
  }
  .main {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .name {
    color: var(--ink);
    font-weight: 600;
    text-decoration: none;
  }
  .name:hover {
    text-decoration: underline;
  }
  .sub {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 10px;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .good {
    color: var(--income);
    font-weight: 600;
  }
  .value {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 8px;
    border-radius: 999px;
    background: color-mix(in oklch, var(--ink) 7%, transparent);
    color: var(--ink-soft);
  }
  .badge.warn {
    background: color-mix(in oklch, var(--warn) 22%, transparent);
    color: var(--ink);
  }
  .repaid {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
  }
  .track {
    display: block;
    flex: 1;
    max-width: 220px;
    height: 6px;
    border-radius: 3px;
    background: color-mix(in oklch, var(--ink) 7%, transparent);
    overflow: hidden;
  }
  .track i {
    display: block;
    height: 100%;
    border-radius: 3px;
  }
  .drawer {
    grid-column: 1 / -1;
  }
  .equity {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 18px;
    padding: 14px 16px;
    border-radius: 12px;
    background: color-mix(in oklch, var(--ink) 4%, transparent);
  }
  .equity h4 {
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .equity .track {
    max-width: none;
  }
  .equity p {
    margin: 0;
  }
  .net {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-top: 18px;
    padding-top: 12px;
    border-top: 2px solid var(--line);
  }
  .net span {
    flex: 1;
    color: var(--ink-soft);
    font-size: var(--text-micro);
  }
  .quiet {
    color: var(--ink-soft);
  }
  .small {
    font-size: var(--text-micro);
  }
  @media (max-width: 900px) {
    .sheet {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 640px) {
    li {
      padding-left: 0;
    }
    .net span {
      display: none;
    }
    .net {
      justify-content: space-between;
    }
  }
</style>
