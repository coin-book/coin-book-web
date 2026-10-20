<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { api } from '@coin-book/core/api';
  import { shortMonth } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { i18n, t, type MessageKey } from '@coin-book/core/i18n';
  import { assetClasses, classColor, rangeChange } from '@coin-book/core/networth';
  import type { NetWorth, NetWorthMonth } from '@coin-book/core/types';
  import AreaChart, { type AreaPoint } from '@coin-book/ui/AreaChart.svelte';
  import Button from '@coin-book/ui/Button.svelte';
  import CategoryBars, { type CategoryBar } from '@coin-book/ui/CategoryBars.svelte';
  import EmptyState from '@coin-book/ui/EmptyState.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import BalanceSheet from '$lib/networth/BalanceSheet.svelte';
  import ChangeBreakdown from '$lib/networth/ChangeBreakdown.svelte';
  import { emptyDetails, loadAccountDetails, type AccountDetails } from '$lib/networth/details';
  import NetWorthHero from '$lib/networth/NetWorthHero.svelte';

  const CZK = 'CZK';
  const ranges = [12, 24, 60] as const;
  const liquidityOrder = ['immediate', 'days', 'locked'] as const;

  const range = $derived(
    ranges.find((r) => String(r) === page.url.searchParams.get('range')) ?? (24 as (typeof ranges)[number]),
  );

  let summary = $state<NetWorth | null>(null);
  /** The months of the range, preceded by the month before it as the baseline of the change. */
  let history = $state<NetWorthMonth[]>([]);
  let details = $state<AccountDetails>(emptyDetails());
  let error = $state('');

  async function load() {
    try {
      const [s, h] = await Promise.all([
        api.get<NetWorth>('/reports/net-worth'),
        api.get<{ months: NetWorthMonth[] }>('/reports/net-worth/history', { months: range + 1 }),
      ]);
      summary = s;
      history = h.months;
      details = await loadAccountDetails(s.accounts);
    } catch (e) {
      error = errorText(e);
    }
  }

  $effect(() => {
    void range;
    void load();
  });

  function setRange(r: number) {
    const url = new URL(page.url);
    url.searchParams.set('range', String(r));
    void goto(url, { replaceState: true, noScroll: true, keepFocus: true });
  }

  const shown = $derived(history.slice(-range));
  const thisMonth = $derived(history.at(-1) ?? null);
  const change = $derived(rangeChange(history));
  const rangeLabel = $derived(t(`netWorth.over.${range}` as MessageKey));

  const points = $derived<AreaPoint[]>(
    shown.map((m) => ({
      key: m.month,
      label: shortMonth(m.month, i18n.locale),
      valueMinor: m.total_czk.minor,
      details: [
        { label: t('netWorth.assets'), valueMinor: m.assets_czk.minor },
        { label: t('netWorth.liabilities'), valueMinor: -m.liabilities_czk.minor },
        { label: t('netWorth.saved'), valueMinor: m.saved_czk.minor },
        { label: t('netWorth.otherChange'), valueMinor: m.other_change_czk.minor },
      ],
    })),
  );

  function classTotal(key: string) {
    return summary?.by_class.find((c) => c.key === key)?.value.minor ?? 0;
  }

  const assetBars = $derived<CategoryBar[]>(
    assetClasses
      .map((c) => ({
        key: c,
        label: t(`netWorth.class.${c}` as MessageKey),
        colorKey: classColor[c],
        amountMinor: classTotal(c),
      }))
      .filter((b) => b.amountMinor > 0),
  );

  const liquidity = $derived(
    liquidityOrder.map((key) => ({
      key,
      minor: summary?.by_liquidity.find((l) => l.key === key)?.value.minor ?? 0,
    })),
  );
  const liquidTotal = $derived(liquidity.reduce((sum, l) => sum + Math.max(0, l.minor), 0));

  const isEmpty = $derived(summary !== null && summary.accounts.length === 0);
</script>

<svelte:head><title>{t('netWorth.title')} · coin-book</title></svelte:head>

<header class="head">
  <div>
    <h1 class="display title">{t('netWorth.title')}</h1>
    <p class="lead">{t('netWorth.lead')}</p>
  </div>
  <Button variant="quiet" icon="plus" href="/accounts?new=property">{t('netWorth.addAsset')}</Button>
</header>

{#if error}
  <p class="error" role="alert">{error}</p>
{:else if isEmpty}
  <EmptyState icon="scales" title={t('netWorth.emptyTitle')} lead={t('netWorth.emptyLead')}>
    <Button href="/imports" icon="upload-simple">{t('overview.toImport')}</Button>
  </EmptyState>
{:else if summary}
  <NetWorthHero {summary} {thisMonth} {change} {rangeLabel} />

  <section class="panel" data-testid="net-worth-history">
    <div class="panel-head">
      <div>
        <h2>{t('netWorth.history')}</h2>
        <p class="quiet small">{t('netWorth.historyLead')}</p>
      </div>
      <div class="ranges" role="group" aria-label={t('netWorth.history')}>
        {#each ranges as r (r)}
          <button type="button" aria-pressed={range === r} onclick={() => setRange(r)}
            >{t(`netWorth.range.${r}` as MessageKey)}</button
          >
        {/each}
      </div>
    </div>
    <AreaChart
      {points}
      currency={CZK}
      label={t('netWorth.history')}
      valueLabel={t('netWorth.total')}
      keyLabel={t('netWorth.month')}
      tableLabel={t('netWorth.asTable')}
      chartLabel={t('netWorth.asChart')}
    />
  </section>

  <div class="columns">
    <ChangeBreakdown {change} {rangeLabel} />

    <section class="panel" data-testid="composition">
      <h2>{t('netWorth.composition')}</h2>
      {#if assetBars.length > 0}
        <CategoryBars bars={assetBars} currency={CZK} label={t('netWorth.composition')} />
      {/if}
      <h3>{t('netWorth.availability')}</h3>
      <ul class="liquidity">
        {#each liquidity as l (l.key)}
          <li>
            <span>{t(`netWorth.liquidity.${l.key}` as MessageKey)}</span>
            <span class="track" aria-hidden="true"
              ><i style="width: {liquidTotal > 0 ? Math.max(0, (l.minor / liquidTotal) * 100) : 0}%"
              ></i></span
            >
            <MoneyAmount amount={{ minor: l.minor, currency: CZK }} whole />
          </li>
        {/each}
      </ul>
    </section>
  </div>

  <BalanceSheet {summary} {details} onvalued={() => void load()} />
{:else}
  <p class="quiet">{t('common.loading')}</p>
{/if}

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 22px;
  }
  .title {
    margin: 0;
    font-size: var(--text-headline);
  }
  .lead {
    margin: 4px 0 0;
    color: var(--ink-soft);
  }
  .panel {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 22px 24px;
    margin-bottom: 18px;
  }
  .panel h2 {
    margin: 0 0 10px;
    font-size: var(--text-body);
    font-weight: 650;
    color: var(--ink-soft);
  }
  .panel h3 {
    margin: 18px 0 8px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-faint);
  }
  .panel-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .panel-head h2 {
    margin-bottom: 2px;
  }
  .ranges {
    display: flex;
    gap: 2px;
  }
  .ranges button {
    border: 0;
    background: none;
    padding: 4px 10px;
    border-radius: 8px;
    font: inherit;
    font-size: var(--text-micro);
    font-weight: 600;
    color: var(--ink-soft);
    cursor: pointer;
    white-space: nowrap;
  }
  .ranges button[aria-pressed='true'] {
    background: color-mix(in oklch, var(--brand) 12%, transparent);
    color: var(--brand);
  }
  .columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 18px;
    margin-bottom: 18px;
  }
  .columns > .panel {
    margin-bottom: 0;
  }
  .liquidity {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .liquidity li {
    display: grid;
    grid-template-columns: 110px 1fr auto;
    align-items: center;
    gap: 12px;
  }
  .track {
    height: 10px;
    border-radius: 5px;
    background: color-mix(in oklch, var(--ink) 6%, transparent);
    overflow: hidden;
  }
  .track i {
    display: block;
    height: 100%;
    border-radius: 5px;
    background: var(--brand);
  }
  .quiet {
    color: var(--ink-soft);
  }
  .small {
    font-size: var(--text-micro);
  }
  .error {
    color: var(--over);
    font-weight: 600;
  }
  @media (max-width: 1100px) {
    .columns {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 640px) {
    .head {
      flex-direction: column;
    }
  }
</style>
