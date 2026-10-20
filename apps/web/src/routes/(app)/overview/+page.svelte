<script lang="ts">
  import { page } from '$app/state';
  import { api } from '@coin-book/core/api';
  import { currentMonth, monthName, shiftMonth } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { daysWord, i18n, t } from '@coin-book/core/i18n';
  import { formatGainPercent, formatWhole } from '@coin-book/core/money';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import type { BudgetMonth, MonthlyReport } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import EmptyState from '@coin-book/ui/EmptyState.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import { attentionItems } from '$lib/overview/attention';
  import WealthSummary from '$lib/overview/WealthSummary.svelte';
  import { loadWealth, type Wealth } from '$lib/overview/wealth';
  import { queue } from '$lib/queue.svelte';

  const CURRENCY = 'CZK';

  // The month of the strip below; the money's details are on /cashflow.
  const month = $derived(page.url.searchParams.get('month') ?? currentMonth());

  let report = $state<MonthlyReport | null>(null);
  let budget = $state<BudgetMonth | null>(null);
  let wealth = $state<Wealth | null>(null);
  let error = $state('');

  $effect(() => {
    const m = month;
    Promise.all([
      api.get<MonthlyReport>(`/reports/monthly/${m}`, { currency: CURRENCY }),
      api.get<BudgetMonth>(`/budgets/${m}`, { currency: CURRENCY }),
    ])
      .then(([r, b]) => {
        report = r;
        budget = b;
      })
      .catch((e) => (error = errorText(e)));
  });

  // Where the user stands is today's, whichever month the strip shows.
  $effect(() => {
    loadWealth()
      .then((w) => (wealth = w))
      .catch((e) => (error = errorText(e)));
  });

  const attention = $derived(
    wealth ? attentionItems(wealth, (id) => taxonomy.accountsById.get(id)?.name ?? '', queue.remaining) : [],
  );
  const hasWealth = $derived((wealth?.netWorth.accounts.length ?? 0) > 0);
  const hasBudget = $derived((budget?.lines.length ?? 0) > 0);
  const isEmpty = $derived(
    !hasWealth && report !== null && report.trend.every((m) => m.income_minor === 0 && m.expense_minor === 0),
  );

  /** Change against the month before, from the trend; empty when that month had nothing. */
  function vsPreviousMonth(key: 'income_minor' | 'expense_minor') {
    const previous = report?.trend.find((m) => m.month === shiftMonth(month, -1));
    if (!report || !previous || previous[key] === 0) return '';
    return formatGainPercent(report[key] - previous[key], previous[key]);
  }
</script>

<svelte:head><title>{t('nav.overview')} · coin-book</title></svelte:head>

{#if error}
  <p class="error" role="alert">{error}</p>
{:else if isEmpty}
  <EmptyState icon="upload-simple" title={t('overview.emptyTitle')} lead={t('overview.emptyLead')}>
    <Button href="/imports" icon="upload-simple">{t('overview.toImport')}</Button>
  </EmptyState>
{:else}
  {#if hasWealth && wealth}
    <header class="section-head">
      <h1 class="display">{t('overview.wealthTitle')}</h1>
      <span class="quiet">{t('overview.wealthLead')}</span>
    </header>
    <WealthSummary {wealth} {attention} />
  {/if}

  {#if report && budget}
    <header class="section-head month">
      <h2 class="display">{t('overview.monthTitle')}</h2>
      <span class="quiet">{monthName(month, i18n.locale)}</span>
      <a class="more" href="/cashflow?month={month}">{t('overview.toCashflow')}</a>
    </header>
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
    </section>
  {:else}
    <p class="quiet">{t('common.loading')}</p>
  {/if}
{/if}

<style>
  .section-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px 16px;
    margin-bottom: 18px;
  }
  .section-head h1,
  .section-head h2 {
    margin: 0;
    font-size: var(--text-headline);
  }
  .section-head.month {
    margin-top: 10px;
  }
  .more {
    margin-left: auto;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--brand);
    text-decoration: none;
  }
  .kpis {
    display: grid;
    grid-template-columns: minmax(240px, 1.6fr) repeat(3, minmax(140px, 1fr));
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
  }
  .kpi h2 {
    margin: 0 0 4px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-faint);
  }
  .small {
    font-size: var(--text-micro);
  }
  .pace {
    margin: 12px 0 0;
    color: var(--ink-soft);
    max-width: 48ch;
  }
  .quiet {
    color: var(--ink-soft);
  }
  .error {
    color: var(--over);
    font-weight: 600;
  }
  @media (max-width: 1100px) {
    .kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .kpi.main {
      grid-column: 1 / -1;
    }
  }
</style>
