<script lang="ts">
  import { formatDecimal, formatGainPercent, formatWhole } from '@coin-book/core/money';
  import { t, type MessageKey } from '@coin-book/core/i18n';
  import { classColor, reserveLevel, reserveProgress, type RangeChange } from '@coin-book/core/networth';
  import type { NetWorth, NetWorthMonth } from '@coin-book/core/types';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';

  type Props = {
    summary: NetWorth;
    thisMonth: NetWorthMonth | null;
    change: RangeChange | null;
    rangeLabel: string;
  };

  let { summary, thisMonth, change, rangeLabel }: Props = $props();

  const CZK = 'CZK';
  const assets = $derived(summary.assets_czk.minor);
  const debts = $derived(summary.liabilities_czk.minor);
  const ownedShare = $derived(assets > 0 ? Math.max(0, Math.min(1, (assets - debts) / assets)) : 0);
  const debtShare = $derived(assets > 0 ? Math.min(1, debts / assets) : debts > 0 ? 1 : 0);
  const reserveMonths = $derived(summary.reserve_months ? Number(summary.reserve_months) : null);
  const level = $derived(reserveMonths === null ? null : reserveLevel(reserveMonths));
</script>

<section class="hero" data-testid="net-worth-kpis">
  <div class="panel main">
    <h2>{t('netWorth.total')}</h2>
    <MoneyAmount amount={summary.total_czk} size="hero" whole />
    <div class="changes">
      {#if thisMonth}
        <span class="change">
          <MoneyAmount amount={thisMonth.change_czk} gain whole />
          <span class="quiet">{t('netWorth.thisMonth').toLowerCase()}</span>
        </span>
      {/if}
      {#if change}
        <span class="change">
          <MoneyAmount amount={{ minor: change.changeMinor, currency: CZK }} gain whole />
          {#if change.share !== null}
            <span class="quiet"
              >({formatGainPercent(change.changeMinor, summary.total_czk.minor - change.changeMinor)})</span
            >
          {/if}
          <span class="quiet">{rangeLabel}</span>
        </span>
      {/if}
    </div>

    {#if assets > 0 || debts > 0}
      <div class="balance" aria-hidden="true">
        {#if ownedShare > 0}<i class="owned" style="flex-grow: {ownedShare}"></i>{/if}
        {#if debtShare > 0}<i
            class="debt"
            style="flex-grow: {debtShare}; background: var(--cat-{classColor.mortgage})"
          ></i>{/if}
      </div>
      <dl class="legend">
        <div>
          <dt><span class="dot owned"></span>{t('netWorth.ownedShare')}</dt>
          <dd><MoneyAmount amount={summary.total_czk} whole /></dd>
        </div>
        <div>
          <dt>
            <span class="dot" style="background: var(--cat-{classColor.mortgage})"></span>{t(
              'netWorth.liabilities',
            )}
          </dt>
          <dd><MoneyAmount amount={summary.liabilities_czk} whole /></dd>
        </div>
        <div class="sum">
          <dt>{t('netWorth.assets')}</dt>
          <dd><MoneyAmount amount={summary.assets_czk} whole /></dd>
        </div>
      </dl>
      {#if debts > 0 && assets > 0}
        <p class="quiet small">{t('netWorth.debtRatio', { share: Math.round((debts / assets) * 100) })}</p>
      {/if}
    {/if}
    {#if summary.unconverted.length > 0}
      <p class="quiet small">{t('netWorth.unconverted', { currencies: summary.unconverted.join(', ') })}</p>
    {/if}
  </div>

  <div class="panel reserve" data-testid="reserve" data-level={level}>
    <h2>{t('netWorth.reserve')}</h2>
    {#if reserveMonths !== null && level}
      <strong class="big"
        >{t('netWorth.reserveTimes', { months: formatDecimal(summary.reserve_months!, 0, 1) })}</strong
      >
      <div
        class="meter"
        role="meter"
        aria-valuemin="0"
        aria-valuemax="6"
        aria-valuenow={Math.min(reserveMonths, 6)}
        aria-label={t('netWorth.reserve')}
      >
        <i style="width: {reserveProgress(reserveMonths) * 100}%"></i>
        <span class="tick" style="left: 50%"></span>
      </div>
      <div class="scale quiet small" aria-hidden="true"><span>0</span><span>3</span><span>6+</span></div>
      <p class="verdict">{t(`netWorth.reserveLevel.${level}` as MessageKey)}</p>
      <p class="quiet small">
        {t('netWorth.reserveLead', { expenses: formatWhole(summary.monthly_expenses_czk.minor, CZK) })}
      </p>
    {:else}
      <p class="quiet small">{t('netWorth.reserveUnknown')}</p>
    {/if}
  </div>
</section>

<style>
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr);
    gap: 14px;
    margin-bottom: 18px;
  }
  .panel {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  h2 {
    margin: 0;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-faint);
  }
  .changes {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 18px;
    font-size: var(--text-micro);
  }
  .change {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
  }
  .balance {
    display: flex;
    gap: 2px;
    height: 12px;
    margin-top: 14px;
  }
  .balance i {
    display: block;
    flex-basis: 0;
    border-radius: 3px;
  }
  .balance i:first-child {
    border-radius: 6px 3px 3px 6px;
  }
  .balance i:last-child {
    border-radius: 3px 6px 6px 3px;
  }
  .balance i:only-child {
    border-radius: 6px;
  }
  .owned {
    background: var(--brand);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 24px;
    margin: 4px 0 0;
  }
  .legend div {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .legend .sum {
    margin-left: auto;
  }
  dt {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  dd {
    margin: 0;
    font-weight: 600;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 3px;
  }
  .big {
    font-size: var(--text-title);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .meter {
    position: relative;
    height: 8px;
    margin-top: 6px;
    border-radius: 4px;
    background: color-mix(in oklch, var(--ink) 7%, transparent);
  }
  .meter i {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: var(--brand);
  }
  .reserve[data-level='low'] .meter i {
    background: var(--warn);
  }
  .tick {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 2px;
    background: var(--surface);
  }
  .scale {
    display: flex;
    justify-content: space-between;
  }
  .verdict {
    margin: 4px 0 0;
    font-weight: 600;
  }
  p {
    margin: 0;
  }
  .quiet {
    color: var(--ink-soft);
  }
  .small {
    font-size: var(--text-micro);
  }
  @media (max-width: 900px) {
    .hero {
      grid-template-columns: 1fr;
    }
    .legend .sum {
      margin-left: 0;
    }
  }
</style>
