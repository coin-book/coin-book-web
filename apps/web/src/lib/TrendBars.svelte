<script lang="ts">
  import { shortMonth } from '@coin-book/core/dates';
  import { i18n } from '@coin-book/core/i18n';
  import { formatWhole } from '@coin-book/core/money';
  import type { MonthlyReport } from '@coin-book/core/types';

  type Props = { trend: MonthlyReport['trend']; currency: string; incomeLabel: string; expenseLabel: string };

  let { trend, currency, incomeLabel, expenseLabel }: Props = $props();

  const max = $derived(Math.max(1, ...trend.flatMap((m) => [m.income_minor, m.expense_minor])));
  const height = 120;
</script>

<div class="trend">
  <div class="bars" style="--h: {height}px">
    {#each trend as m (m.month)}
      <div class="month">
        <div class="pair">
          <span
            class="bar income"
            style="height: {(m.income_minor / max) * height}px"
            title="{incomeLabel}: {formatWhole(m.income_minor, currency)}"
          ></span>
          <span
            class="bar expense"
            style="height: {(m.expense_minor / max) * height}px"
            title="{expenseLabel}: {formatWhole(m.expense_minor, currency)}"
          ></span>
        </div>
        <span class="label">{shortMonth(m.month, i18n.locale)}</span>
      </div>
    {/each}
  </div>
  <div class="key">
    <span><i class="income"></i>{incomeLabel}</span>
    <span><i class="expense"></i>{expenseLabel}</span>
  </div>
</div>

<style>
  .bars {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 10px;
    align-items: end;
  }
  .month {
    display: grid;
    justify-items: center;
    gap: 8px;
  }
  .pair {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: var(--h);
  }
  .bar {
    width: 14px;
    min-height: 2px;
    border-radius: 5px 5px 2px 2px;
  }
  .income {
    background: var(--income);
  }
  .expense {
    background: color-mix(in oklch, var(--ink) 72%, transparent);
  }
  .label {
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .key {
    display: flex;
    gap: 18px;
    margin-top: 14px;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .key i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    margin-right: 6px;
    vertical-align: -1px;
  }
</style>
