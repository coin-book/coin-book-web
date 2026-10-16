<script lang="ts">
  import { page } from '$app/state';
  import { api } from '@coin-book/core/api';
  import { currentMonth } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { daysWord, t } from '@coin-book/core/i18n';
  import { formatWhole } from '@coin-book/core/money';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import type { BudgetMonth, MonthlyReport, Transaction } from '@coin-book/core/types';
  import BudgetTube from '@coin-book/ui/BudgetTube.svelte';
  import Button from '@coin-book/ui/Button.svelte';
  import EmptyState from '@coin-book/ui/EmptyState.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import MonthRibbon, { type RibbonSegment } from '@coin-book/ui/MonthRibbon.svelte';
  import MonthSwitcher from '@coin-book/ui/MonthSwitcher.svelte';
  import TransactionRow from '@coin-book/ui/TransactionRow.svelte';
  import { categorize } from '$lib/categorize';
  import TrendBars from '$lib/TrendBars.svelte';

  const CURRENCY = 'CZK';
  const BURNING_LIMIT = 3;
  const RECENT_LIMIT = 8;
  const statusWeight = { over: 0, ahead_of_pace: 1, on_track: 2 } as const;

  const month = $derived(page.url.searchParams.get('mesic') ?? currentMonth());

  let report = $state<MonthlyReport | null>(null);
  let budget = $state<BudgetMonth | null>(null);
  let recent = $state<Transaction[]>([]);
  let error = $state('');

  $effect(() => {
    const m = month;
    error = '';
    Promise.all([
      api.get<MonthlyReport>(`/reports/monthly/${m}`, { currency: CURRENCY }),
      api.get<BudgetMonth>(`/budgets/${m}`, { currency: CURRENCY }),
      api.get<{ transactions: Transaction[] }>('/transactions', { limit: RECENT_LIMIT, to: lastDay(m) }),
    ])
      .then(([r, b, tx]) => {
        report = r;
        budget = b;
        recent = tx.transactions;
      })
      .catch((e) => (error = errorText(e)));
  });

  function lastDay(m: string) {
    const [y, mo] = m.split('-').map(Number);
    return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
  }

  const segments = $derived<RibbonSegment[]>(
    (report?.expenses ?? []).map((e) => ({
      key: e.category_id ?? 'uncategorized',
      label: e.category_id ? taxonomy.label(e.category_id) : t('overview.uncategorized'),
      colorKey: e.category_id ? taxonomy.colorKey(e.category_id) : 'uncategorized',
      amountMinor: e.amount_minor,
      href: e.category_id
        ? `/transakce?kategorie=${e.category_id}&od=${month}-01&do=${lastDay(month)}`
        : '/k-vyreseni',
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
</script>

<svelte:head><title>{t('nav.overview')} · coin-book</title></svelte:head>

<header class="head">
  <MonthSwitcher {month} hrefFor={(m) => `/prehled?mesic=${m}`} />
</header>

{#if error}
  <p class="error" role="alert">{error}</p>
{:else if report && budget}
  {#if isEmpty}
    <EmptyState icon="upload-simple" title={t('overview.emptyTitle')} lead={t('overview.emptyLead')}>
      <Button href="/importy" icon="upload-simple">{t('overview.toImport')}</Button>
    </EmptyState>
  {:else}
    <section class="hero">
      <div class="left-to-spend">
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
          <Button variant="quiet" href="/rozpocet/{month}" icon="target">{t('overview.setBudget')}</Button>
        {/if}
      </div>
      <dl class="totals">
        <div>
          <dt>{t('overview.income')}</dt>
          <dd>
            <MoneyAmount amount={{ minor: report.income_minor, currency: CURRENCY }} size="lg" whole signed />
          </dd>
        </div>
        <div>
          <dt>{t('overview.expenses')}</dt>
          <dd>
            <MoneyAmount amount={{ minor: report.expense_minor, currency: CURRENCY }} size="lg" whole />
          </dd>
        </div>
        <div>
          <dt>{t('overview.saved')}</dt>
          <dd>
            <MoneyAmount amount={{ minor: report.financial_minor, currency: CURRENCY }} size="lg" whole />
          </dd>
        </div>
      </dl>
    </section>

    {#if segments.length > 0}
      <section class="panel ribbon">
        <h2>{t('overview.whereMoneyWent')}</h2>
        <MonthRibbon {segments} currency={CURRENCY} label={t('overview.whereMoneyWent')} />
      </section>
    {/if}

    <div class="columns">
      <section class="panel">
        <div class="panel-head">
          <h2>{t('overview.burning')}</h2>
          <a href="/rozpocet/{month}">{t('nav.budget')}</a>
        </div>
        {#if !hasBudget}
          <p class="quiet">{t('overview.noBudget')}</p>
        {:else}
          {#each burning as line (line.category_id)}
            <BudgetTube
              label={taxonomy.label(line.category_id)}
              colorKey={taxonomy.colorKey(line.category_id)}
              icon={taxonomy.icon(line.category_id)}
              plannedMinor={line.planned_minor}
              spentMinor={line.spent_minor}
              currency={CURRENCY}
              elapsed={paceElapsed}
              status={line.status}
              href="/rozpocet/{month}"
            />
          {/each}
          {#if allCalm}<p class="quiet calm">{t('overview.allCalm')}</p>{/if}
        {/if}
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>{t('overview.recent')}</h2>
          <a href="/transakce">{t('overview.allTransactions')}</a>
        </div>
        <div class="recent">
          {#each recent as tx (tx.id)}
            <TransactionRow {tx} showAccount={false} oncategorize={onCategorize} />
          {/each}
        </div>
      </section>
    </div>

    <section class="panel">
      <h2>{t('overview.trend')}</h2>
      <TrendBars
        trend={report.trend}
        currency={CURRENCY}
        incomeLabel={t('overview.income')}
        expenseLabel={t('overview.expenses')}
      />
    </section>
  {/if}
{:else}
  <p class="quiet">{t('common.loading')}</p>
{/if}

<style>
  .head {
    margin-bottom: 28px;
  }
  .hero {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 28px;
    margin-bottom: 30px;
  }
  .left-to-spend h2,
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
  .totals {
    display: flex;
    gap: clamp(18px, 4vw, 44px);
    margin: 0;
  }
  .totals dt {
    font-size: var(--text-micro);
    color: var(--ink-faint);
    margin-bottom: 4px;
  }
  .totals dd {
    margin: 0;
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
  }
</style>
