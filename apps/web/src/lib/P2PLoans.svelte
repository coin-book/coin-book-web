<script lang="ts">
  import { shortDate, shortMonth } from '@coin-book/core/dates';
  import { daysWord, i18n, t } from '@coin-book/core/i18n';
  import { formatPercent } from '@coin-book/core/money';
  import type { P2PSnapshot } from '@coin-book/core/types';
  import ColumnChart, { type ColumnGroup, type ColumnSeries } from '@coin-book/ui/ColumnChart.svelte';
  import Icon from '@coin-book/ui/Icon.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';

  let { snapshot }: { snapshot: P2PSnapshot } = $props();

  let showRepaid = $state(false);

  const currency = $derived(snapshot.outstanding.currency);
  const loans = $derived(snapshot.loans.filter((l) => showRepaid || l.outstanding.minor > 0));
  const repaidCount = $derived(snapshot.loans.filter((l) => l.outstanding.minor === 0).length);

  const series = $derived<ColumnSeries[]>([
    { key: 'outstanding', label: t('p2p.outstanding'), color: 'var(--cat-mandarinka)' },
  ]);
  const groups = $derived<ColumnGroup[]>(
    snapshot.maturities.map((m) => ({
      key: m.month ?? 'none',
      label: m.month ? `${shortMonth(m.month, i18n.locale)} ${m.month.slice(2, 4)}` : t('p2p.noDate'),
      values: { outstanding: m.outstanding.minor },
    })),
  );
</script>

<section class="kpis" data-testid="p2p-kpis">
  <div class="kpi">
    <h2>{t('p2p.outstanding')}</h2>
    <MoneyAmount amount={snapshot.outstanding} size="lg" whole />
    <span class="quiet small">{t('p2p.snapshotOn', { date: shortDate(snapshot.on) })}</span>
  </div>
  <div class="kpi" class:risk={snapshot.at_risk.minor > 0}>
    <h2>{t('p2p.atRisk')}</h2>
    <MoneyAmount amount={snapshot.at_risk} size="lg" whole />
    <span class="quiet small">{t('p2p.atRiskLead')}</span>
  </div>
  <div class="kpi">
    <h2>{t('p2p.earned')}</h2>
    <MoneyAmount amount={snapshot.earned} size="lg" gain whole />
    {#if snapshot.earned_since_previous && snapshot.previous_on}
      <span class="quiet small"
        ><MoneyAmount amount={snapshot.earned_since_previous} gain whole />
        {t('p2p.earnedSince', { date: shortDate(snapshot.previous_on) })}</span
      >
    {/if}
  </div>
  <div class="kpi">
    <h2>{t('p2p.averageRate')}</h2>
    <strong class="big">{formatPercent(snapshot.average_rate)}</strong>
  </div>
</section>

{#if groups.length > 0}
  <section class="panel" data-testid="p2p-maturities">
    <h2>{t('p2p.maturities')}</h2>
    <p class="quiet small lead">{t('p2p.maturitiesLead')}</p>
    <ColumnChart {series} {groups} {currency} label={t('p2p.maturities')} />
  </section>
{/if}

<section class="panel" data-testid="p2p-loans">
  <div class="panel-head">
    <h2>{t('p2p.loans')}</h2>
    {#if repaidCount > 0}
      <label class="check"><input type="checkbox" bind:checked={showRepaid} /> {t('p2p.showRepaid')}</label>
    {/if}
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th scope="col">{t('p2p.loan')}</th>
          <th scope="col" class="num">{t('p2p.rate')}</th>
          <th scope="col">{t('p2p.finalPayment')}</th>
          <th scope="col">{t('p2p.status')}</th>
          <th scope="col" class="num">{t('p2p.outstanding')}</th>
        </tr>
      </thead>
      <tbody>
        {#each loans as l (l.loan_number)}
          <tr data-testid="p2p-loan" data-loan={l.loan_number} class:at-risk={l.at_risk}>
            <th scope="row">
              <span class="loan-name">{l.name}</span>
              <span class="quiet small num">{l.loan_number} · {l.repayment}</span>
            </th>
            <td class="num">{formatPercent(l.interest_rate)}</td>
            <td>{l.final_payment_on ? shortDate(l.final_payment_on) : '—'}</td>
            <td>
              {#if l.at_risk}
                <span class="badge warn"
                  ><Icon name="warning" size={13} />
                  {l.delay_days > 0
                    ? t('p2p.late', { days: l.delay_days, daysWord: daysWord(l.delay_days) })
                    : l.repayment_status || l.status}</span
                >
              {:else}
                <span class="quiet">{l.outstanding.minor === 0 ? t('p2p.repaid') : l.status}</span>
              {/if}
            </td>
            <td class="num"><MoneyAmount amount={l.outstanding} whole /></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<style>
  .kpis {
    display: grid;
    grid-template-columns: repeat(4, minmax(150px, 1fr));
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
  .kpi.risk {
    box-shadow: inset 3px 0 0 var(--warn);
  }
  .kpi h2 {
    margin: 0 0 4px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-faint);
  }
  .big {
    font-size: var(--text-title);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .panel {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 22px 24px;
    margin-bottom: 18px;
  }
  .panel h2 {
    margin: 0 0 6px;
    font-size: var(--text-body);
    font-weight: 650;
    color: var(--ink-soft);
  }
  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .lead {
    margin: 0 0 10px;
  }
  .check {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    text-align: left;
    padding: 8px 6px;
    border-top: 1px solid var(--line);
    font-weight: 500;
    vertical-align: top;
  }
  thead th {
    border-top: 0;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-faint);
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .loan-name {
    display: block;
    font-weight: 600;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: var(--text-micro);
  }
  .badge.warn {
    background: color-mix(in oklch, var(--warn) 22%, transparent);
  }
  .quiet {
    color: var(--ink-soft);
  }
  .small {
    font-size: var(--text-micro);
  }
  @media (max-width: 1100px) {
    .kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
