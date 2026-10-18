<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { api } from '@coin-book/core/api';
  import { currentMonth, shiftMonth, shortMonth } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { daysWord, i18n, t } from '@coin-book/core/i18n';
  import { formatGainPercent, formatWhole } from '@coin-book/core/money';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import type {
    BudgetMonth,
    CategoriesReport,
    FlowsReport,
    MonthlyReport,
    NetWorth,
    Transaction,
  } from '@coin-book/core/types';
  import BudgetBullets, { type BudgetBullet } from '@coin-book/ui/BudgetBullets.svelte';
  import Button from '@coin-book/ui/Button.svelte';
  import ColumnChart, { type ColumnGroup, type ColumnSeries } from '@coin-book/ui/ColumnChart.svelte';
  import EmptyState from '@coin-book/ui/EmptyState.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import CategoryBars, { type CategoryBar } from '@coin-book/ui/CategoryBars.svelte';
  import MonthSwitcher from '@coin-book/ui/MonthSwitcher.svelte';
  import Sankey, { type SankeyLink, type SankeyNode } from '@coin-book/ui/Sankey.svelte';
  import TransactionRow from '@coin-book/ui/TransactionRow.svelte';
  import { categorize, confirmAutomatic } from '$lib/categorize';

  const CURRENCY = 'CZK';
  const BURNING_LIMIT = 3;
  const RECENT_LIMIT = 8;
  const HISTORY_MONTHS = 12;
  const STACK_LIMIT = 7;
  const statusWeight = { over: 0, ahead_of_pace: 1, on_track: 2 } as const;

  const month = $derived(page.url.searchParams.get('month') ?? currentMonth());

  let report = $state<MonthlyReport | null>(null);
  let budget = $state<BudgetMonth | null>(null);
  let recent = $state<Transaction[]>([]);
  let flows = $state<FlowsReport | null>(null);
  let history = $state<CategoriesReport | null>(null);
  let netWorth = $state<NetWorth | null>(null);
  let error = $state('');

  $effect(() => {
    const m = month;
    error = '';
    Promise.all([
      api.get<MonthlyReport>(`/reports/monthly/${m}`, { currency: CURRENCY }),
      api.get<BudgetMonth>(`/budgets/${m}`, { currency: CURRENCY }),
      api.get<{ transactions: Transaction[] }>('/transactions', { limit: RECENT_LIMIT, to: lastDay(m) }),
      api.get<FlowsReport>(`/reports/flows/${m}`, { currency: CURRENCY }),
      api.get<CategoriesReport>('/reports/categories', { to: m, months: HISTORY_MONTHS, currency: CURRENCY }),
      api.get<NetWorth>('/reports/net-worth'),
    ])
      .then(([r, b, tx, f, h, w]) => {
        netWorth = w;
        report = r;
        budget = b;
        recent = tx.transactions;
        flows = f;
        history = h;
      })
      .catch((e) => (error = errorText(e)));
  });

  /** The `chart` URL parameter picks the chart in the tabbed card; without it, the money flow. */
  const charts = [
    { param: '', key: 'flows', label: 'overview.flows' },
    { param: 'trend', key: 'trend', label: 'overview.trend' },
    { param: 'categories', key: 'categories', label: 'overview.categoriesTrend' },
  ] as const;
  const chart = $derived(
    charts.find((c) => c.param === (page.url.searchParams.get('chart') ?? '')) ?? charts[0],
  );

  function showChart(param: string) {
    const url = new URL(page.url);
    if (param) url.searchParams.set('chart', param);
    else url.searchParams.delete('chart');
    void goto(url, { replaceState: true, noScroll: true, keepFocus: true });
  }

  /** Change against the month before, from the trend; empty when that month had nothing. */
  function vsPreviousMonth(key: 'income_minor' | 'expense_minor') {
    const previous = report?.trend.find((m) => m.month === shiftMonth(month, -1));
    if (!report || !previous || previous[key] === 0) return '';
    return formatGainPercent(report[key] - previous[key], previous[key]);
  }

  function monthRange(m: string) {
    return `from=${m}-01&to=${lastDay(m)}`;
  }

  function categoryName(id: string | null | undefined) {
    return id ? taxonomy.label(id) : t('overview.uncategorized');
  }

  const flowNodes = $derived<SankeyNode[]>(
    (flows?.nodes ?? []).map((n) => {
      const account = n.account_id ? taxonomy.accountsById.get(n.account_id) : undefined;
      switch (n.kind) {
        case 'income':
          return {
            key: n.key,
            column: 0,
            label: categoryName(n.category_id),
            colorKey: n.category_id ? taxonomy.colorKey(n.category_id) : 'income',
            href: n.category_id ? `/transactions?category=${n.category_id}&${monthRange(month)}` : undefined,
          };
        case 'account':
          return {
            key: n.key,
            column: 1,
            label: account?.name ?? '',
            colorKey: account?.color_key ?? 'bridlice',
            href: `/transactions?account=${n.account_id}&${monthRange(month)}`,
          };
        case 'saving':
          return {
            key: n.key,
            column: 2,
            label: account?.name ?? '',
            colorKey: account?.color_key ?? 'transfer',
          };
        default:
          return {
            key: n.key,
            column: 2,
            label: categoryName(n.category_id),
            colorKey: n.category_id ? taxonomy.colorKey(n.category_id) : 'uncategorized',
            href: n.category_id ? `/transactions?category=${n.category_id}&${monthRange(month)}` : '/triage',
          };
      }
    }),
  );
  /** A flow opens the transactions behind it: the account's, in the category at the other end. */
  function flowHref(sourceKey: string, targetKey: string) {
    const ends = [flowNodesByKey.get(sourceKey), flowNodesByKey.get(targetKey)];
    const account = ends.find((n) => n?.kind === 'account');
    const category = ends.find((n) => n?.kind !== 'account' && n?.kind !== 'saving');
    if (!account?.account_id) return undefined;
    const params = new URLSearchParams({ account: account.account_id });
    if (category?.category_id) params.set('category', category.category_id);
    return `/transactions?${params}&${monthRange(month)}`;
  }
  const flowNodesByKey = $derived(new Map((flows?.nodes ?? []).map((n) => [n.key, n])));
  const flowLinks = $derived<SankeyLink[]>(
    (flows?.links ?? []).map((l) => ({
      source: l.source,
      target: l.target,
      amountMinor: l.amount_minor,
      href: flowHref(l.source, l.target),
    })),
  );

  const trendSeries = $derived<ColumnSeries[]>([
    { key: 'income', label: t('overview.income'), color: 'var(--income)' },
    {
      key: 'expense',
      label: t('overview.expenses'),
      color: 'color-mix(in oklch, var(--ink) 72%, transparent)',
    },
    { key: 'financial', label: t('overview.saved'), color: 'var(--cat-chrpa)' },
  ]);
  const trendGroups = $derived<ColumnGroup[]>(
    (report?.trend ?? []).map((m) => ({
      key: m.month,
      label: shortMonth(m.month, i18n.locale),
      values: { income: m.income_minor, expense: m.expense_minor, financial: m.financial_minor },
      current: m.month === month,
    })),
  );

  // Stacked categories: the biggest categories over the whole period keep their own
  // segment, the rest fold into "other", so the legend stays readable.
  const stackSeries = $derived.by<ColumnSeries[]>(() => {
    const totals = new Map<string, number>();
    for (const m of history?.months ?? []) {
      for (const e of m.expenses) {
        const key = e.category_id ?? 'uncategorized';
        totals.set(key, (totals.get(key) ?? 0) + e.amount_minor);
      }
    }
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key);
    const top = ranked.slice(0, STACK_LIMIT);
    const series = top.map((key) => ({
      key,
      label: key === 'uncategorized' ? t('overview.uncategorized') : taxonomy.label(key),
      color: key === 'uncategorized' ? 'var(--cat-uncategorized)' : `var(--cat-${taxonomy.colorKey(key)})`,
    }));
    if (ranked.length > top.length)
      series.push({
        key: 'other',
        label: t('overview.otherCategories'),
        color: 'color-mix(in oklch, var(--ink) 35%, transparent)',
      });
    return series;
  });
  const stackGroups = $derived<ColumnGroup[]>(
    (history?.months ?? []).map((m) => {
      const values: Record<string, number> = {};
      const own = new Set(stackSeries.map((s) => s.key));
      for (const e of m.expenses) {
        const key = e.category_id ?? 'uncategorized';
        const slot = own.has(key) ? key : 'other';
        values[slot] = (values[slot] ?? 0) + e.amount_minor;
      }
      return {
        key: m.month,
        label: shortMonth(m.month, i18n.locale),
        values,
        current: m.month === month,
      };
    }),
  );

  /** A segment of the stacked chart opens that category's transactions in that month. */
  function selectCategoryMonth(m: string, seriesKey?: string) {
    if (seriesKey === 'uncategorized') return goto('/triage');
    if (!seriesKey || seriesKey === 'other') return goto(`/overview?month=${m}`);
    return goto(`/transactions?category=${seriesKey}&${monthRange(m)}`);
  }

  function lastDay(m: string) {
    const [y, mo] = m.split('-').map(Number);
    return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
  }

  const segments = $derived<CategoryBar[]>(
    (report?.expenses ?? []).map((e) => ({
      key: e.category_id ?? 'uncategorized',
      label: e.category_id ? taxonomy.label(e.category_id) : t('overview.uncategorized'),
      colorKey: e.category_id ? taxonomy.colorKey(e.category_id) : 'uncategorized',
      amountMinor: e.amount_minor,
      href: e.category_id
        ? `/transactions?category=${e.category_id}&from=${month}-01&to=${lastDay(month)}`
        : '/triage',
    })),
  );

  const burning = $derived(
    [...(budget?.lines ?? [])]
      .filter((l) => l.category_id)
      .sort(
        (a, b) =>
          statusWeight[a.status] - statusWeight[b.status] ||
          b.spent_minor / Math.max(b.planned_minor, 1) - a.spent_minor / Math.max(a.planned_minor, 1),
      )
      .slice(0, BURNING_LIMIT),
  );
  const burningBullets = $derived<BudgetBullet[]>(
    burning.map((line) => ({
      key: line.category_id ?? '',
      label: taxonomy.label(line.category_id),
      colorKey: taxonomy.colorKey(line.category_id),
      plannedMinor: line.planned_minor,
      spentMinor: line.spent_minor,
      status: line.status,
      href: `/transactions?category=${line.category_id}&${monthRange(month)}`,
    })),
  );
  const allCalm = $derived(burning.every((l) => l.status === 'on_track'));
  const hasBudget = $derived((budget?.lines.length ?? 0) > 0);
  const isEmpty = $derived(
    report !== null && report.trend.every((m) => m.income_minor === 0 && m.expense_minor === 0),
  );
  const paceElapsed = $derived(budget && budget.elapsed > 0 && budget.elapsed < 1 ? budget.elapsed : null);

  async function onCategorize(tx: Transaction, categoryId: string, saveRule: boolean) {
    const updated = await categorize(tx, categoryId, saveRule);
    if (updated) recent = recent.map((r) => (r.id === updated.id ? updated : r));
  }

  async function onConfirm(tx: Transaction) {
    const updated = await confirmAutomatic(tx);
    if (updated) recent = recent.map((r) => (r.id === updated.id ? updated : r));
  }
</script>

<svelte:head><title>{t('nav.overview')} · coin-book</title></svelte:head>

<header class="head">
  <MonthSwitcher {month} hrefFor={(m) => `/overview?month=${m}`} />
</header>

{#if error}
  <p class="error" role="alert">{error}</p>
{:else if report && budget}
  {#if isEmpty}
    <EmptyState icon="upload-simple" title={t('overview.emptyTitle')} lead={t('overview.emptyLead')}>
      <Button href="/imports" icon="upload-simple">{t('overview.toImport')}</Button>
    </EmptyState>
  {:else}
    <section class="kpis" data-testid="kpis">
      <div class="kpi main">
        <h2>{t('overview.leftToSpend')}</h2>
        {#if hasBudget}
          <MoneyAmount amount={{ minor: budget.remaining_minor, currency: CURRENCY }} size="hero" whole />
          <p class="pace">
            {#if budget.days_left > 0}
              {t('overview.perDay', {
                days: budget.days_left,
                daysWord: daysWord(budget.days_left),
                perDay: formatWhole(budget.per_day_minor, CURRENCY),
              })}
            {:else}
              {t('overview.monthOver')}
            {/if}
          </p>
        {:else}
          <p class="pace">{t('overview.noBudget')}</p>
          <Button variant="quiet" href="/budget/{month}" icon="target">{t('overview.setBudget')}</Button>
        {/if}
      </div>
      <div class="kpi">
        <h2>{t('overview.income')}</h2>
        <MoneyAmount amount={{ minor: report.income_minor, currency: CURRENCY }} size="lg" whole signed />
        {#if vsPreviousMonth('income_minor')}<span class="quiet small"
            >{t('overview.vsPrevious', { change: vsPreviousMonth('income_minor') })}</span
          >{/if}
      </div>
      <div class="kpi">
        <h2>{t('overview.expenses')}</h2>
        <MoneyAmount amount={{ minor: report.expense_minor, currency: CURRENCY }} size="lg" whole />
        {#if vsPreviousMonth('expense_minor')}<span class="quiet small"
            >{t('overview.vsPrevious', { change: vsPreviousMonth('expense_minor') })}</span
          >{/if}
      </div>
      <div class="kpi">
        <h2>{t('overview.saved')}</h2>
        <MoneyAmount amount={{ minor: report.financial_minor, currency: CURRENCY }} size="lg" whole />
        {#if report.set_aside.length > 0}<span class="quiet small"
            >{t('overview.setAsideCount', { count: report.set_aside.length })}</span
          >{/if}
      </div>
      {#if netWorth}
        <a class="kpi worth" href="/investments" data-testid="net-worth">
          <h2>{t('overview.netWorth')}</h2>
          <MoneyAmount amount={netWorth.total_czk} size="lg" whole />
          <span class="quiet small"
            >{t('overview.netWorthSplit', {
              cash: formatWhole(netWorth.cash_czk.minor, 'CZK'),
              investments: formatWhole(netWorth.investments_czk.minor, 'CZK'),
            })}</span
          >
        </a>
      {/if}
    </section>

    <div class="columns">
      <section class="panel ribbon">
        <h2>{t('overview.whereMoneyWent')}</h2>
        {#if segments.length > 0}
          <CategoryBars
            bars={segments}
            currency={CURRENCY}
            label={t('overview.whereMoneyWent')}
            onselect={(b) => b.href && goto(b.href)}
          />
        {:else}
          <p class="quiet">{t('overview.noSpending')}</p>
        {/if}
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>{t('overview.burning')}</h2>
          <a href="/budget/{month}">{t('nav.budget')}</a>
        </div>
        {#if !hasBudget}
          <p class="quiet">{t('overview.noBudget')}</p>
        {:else}
          <BudgetBullets
            lines={burningBullets}
            currency={CURRENCY}
            label={t('overview.burning')}
            elapsed={paceElapsed}
            onselect={(line) => line.href && goto(line.href)}
          />
          {#if allCalm}<p class="quiet calm">{t('overview.allCalm')}</p>{/if}
        {/if}
      </section>
    </div>

    <section class="panel charts" data-testid="charts-panel">
      <div class="tabs" role="tablist" aria-label={t('overview.charts')}>
        {#each charts as c (c.key)}
          <button
            type="button"
            role="tab"
            aria-selected={chart.key === c.key}
            onclick={() => showChart(c.param)}>{t(c.label)}</button
          >
        {/each}
      </div>

      {#if chart.key === 'flows'}
        <div data-testid="flows-panel">
          {#if flowLinks.length > 0}
            <p class="quiet lead">{t('overview.flowsLead')}</p>
            <Sankey
              nodes={flowNodes}
              links={flowLinks}
              currency={CURRENCY}
              label={t('overview.flows')}
              tableLabel={t('overview.asTable')}
            />
          {:else}
            <p class="quiet">{t('overview.noSpending')}</p>
          {/if}
          {#if report.set_aside.length > 0}
            <div class="set-aside-block" data-testid="set-aside-panel">
              <h3>{t('overview.setAside')}</h3>
              <p class="quiet lead">{t('overview.setAsideLead')}</p>
              <ul class="set-aside">
                {#each report.set_aside as flow (flow.account_id)}
                  <li>
                    <a href="/transactions?account={flow.account_id}"
                      >{taxonomy.accountsById.get(flow.account_id)?.name ?? ''}</a
                    >
                    <MoneyAmount amount={{ minor: flow.amount_minor, currency: CURRENCY }} whole signed />
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {:else if chart.key === 'trend'}
        <div data-testid="trend-panel">
          <ColumnChart
            series={trendSeries}
            groups={trendGroups}
            currency={CURRENCY}
            label={t('overview.trend')}
            onselect={(m) => goto(`/overview?month=${m}&chart=trend`)}
          />
        </div>
      {:else}
        <div data-testid="categories-panel">
          <ColumnChart
            series={stackSeries}
            groups={stackGroups}
            currency={CURRENCY}
            label={t('overview.categoriesTrend')}
            mode="stacked"
            onselect={selectCategoryMonth}
          />
        </div>
      {/if}
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>{t('overview.recent')}</h2>
        <a href="/transactions">{t('overview.allTransactions')}</a>
      </div>
      <div class="recent">
        {#each recent as tx (tx.id)}
          <TransactionRow {tx} showAccount={false} oncategorize={onCategorize} onconfirm={onConfirm} />
        {/each}
      </div>
    </section>
  {/if}
{:else}
  <p class="quiet">{t('common.loading')}</p>
{/if}

<style>
  .kpis {
    display: grid;
    grid-template-columns: minmax(240px, 1.6fr) repeat(4, minmax(140px, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }
  .kpi {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 18px 20px;
    color: inherit;
    text-decoration: none;
  }
  .kpi h2 {
    margin: 0 0 4px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-faint);
  }
  a.kpi:hover {
    box-shadow: var(--glow);
  }
  .small {
    font-size: var(--text-micro);
  }
  .tabs {
    display: flex;
    gap: 4px;
    margin: -6px 0 16px;
    box-shadow: inset 0 -1px 0 var(--line);
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
  }
  .tabs button {
    border: 0;
    background: none;
    padding: 8px 12px;
    font: inherit;
    font-weight: 600;
    color: var(--ink-soft);
    border-bottom: 2px solid transparent;
    cursor: pointer;
    white-space: nowrap;
  }
  .tabs button[aria-selected='true'] {
    color: var(--ink);
    border-bottom-color: var(--brand);
  }
  .set-aside-block {
    margin-top: 22px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
  }
  .set-aside-block h3 {
    margin: 0 0 8px;
    font-size: var(--text-body);
    color: var(--ink-soft);
  }
  .lead {
    margin: -6px 0 10px;
    font-size: var(--text-micro);
  }
  .set-aside {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 8px 24px;
  }
  .set-aside li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 8px 0;
    border-top: 1px solid var(--line);
  }
  .set-aside a {
    color: var(--ink);
    font-weight: 600;
    text-decoration: none;
  }
  .set-aside a:hover {
    text-decoration: underline;
  }
  .head {
    margin-bottom: 28px;
  }
  .panel h2 {
    margin: 0 0 10px;
    font-size: var(--text-body);
    font-weight: 650;
    color: var(--ink-soft);
  }
  .pace {
    margin: 12px 0 0;
    color: var(--ink-soft);
    max-width: 48ch;
  }
  .panel {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 22px 24px;
    margin-bottom: 18px;
  }
  .ribbon {
    padding-bottom: 18px;
  }
  .columns {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: 18px;
  }
  .columns .panel {
    margin-bottom: 18px;
  }
  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .panel-head a {
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--brand);
    text-decoration: none;
  }
  .recent {
    margin: 0 -14px;
  }
  .quiet {
    color: var(--ink-soft);
  }
  .calm {
    margin: 8px 0 0;
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
    .kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .kpi.main {
      grid-column: 1 / -1;
    }
  }
</style>
