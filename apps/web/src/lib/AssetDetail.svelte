<script lang="ts">
  import { api, ApiError } from '@coin-book/core/api';
  import { shortDate } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { t } from '@coin-book/core/i18n';
  import { formatRate } from '@coin-book/core/money';
  import { toasts } from '@coin-book/core/toast';
  import type { Account, AccountPerformance, AccountValuation, P2PSnapshot } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import P2PLoans from '$lib/P2PLoans.svelte';
  import ValuationForm from '$lib/ValuationForm.svelte';

  let { account }: { account: Account } = $props();

  let performance = $state<AccountPerformance | null>(null);
  let valuations = $state<AccountValuation[]>([]);
  let p2p = $state<P2PSnapshot | null>(null);
  let error = $state('');

  async function load() {
    try {
      const [perf, vals, loans] = await Promise.all([
        api.get<AccountPerformance>(`/accounts/${account.id}/performance`),
        api.get<{ valuations: AccountValuation[] }>(`/accounts/${account.id}/valuations`),
        account.kind === 'p2p' ? loadP2P() : null,
      ]);
      performance = perf;
      valuations = vals.valuations;
      p2p = loans;
    } catch (e) {
      error = errorText(e);
    }
  }

  // A platform without an imported export yet answers 404; that is no error here.
  async function loadP2P() {
    try {
      return await api.get<P2PSnapshot>(`/accounts/${account.id}/p2p-loans`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  }

  $effect(() => {
    void load();
  });

  async function remove(v: AccountValuation) {
    try {
      await api.delete(`/accounts/${account.id}/valuations/${v.id}`);
      await load();
    } catch (e) {
      toasts.show(errorText(e), 'error');
    }
  }
</script>

{#if error}
  <p class="error" role="alert">{error}</p>
{:else if performance}
  <section class="kpis" data-testid="asset-kpis">
    <div class="kpi main">
      <h2>{t('asset.value')}</h2>
      {#if performance.value}
        <MoneyAmount amount={performance.value} size="hero" whole />
        {#if performance.valued_on}<p class="quiet small">
            {t('netWorth.valuedOn', { date: shortDate(performance.valued_on) })}
          </p>{/if}
      {:else}
        <p class="quiet">{t('valuation.none')}</p>
      {/if}
    </div>
    <div class="kpi">
      <h2>{t('asset.contributed')}</h2>
      <MoneyAmount amount={performance.contributed} size="lg" whole />
      {#if performance.valued_on}
        <span class="quiet small"
          >{t('asset.contributedUntil', { date: shortDate(performance.valued_on) })}</span
        >
      {/if}
      {#if performance.withdrawn.minor > 0}
        <span class="quiet small"
          >{t('asset.withdrawn')} <MoneyAmount amount={performance.withdrawn} whole /></span
        >
      {/if}
    </div>
    <div class="kpi">
      <h2>{t('asset.gain')}</h2>
      {#if performance.gain}<MoneyAmount amount={performance.gain} size="lg" gain whole />{:else}<span
          class="quiet">—</span
        >{/if}
    </div>
    <div class="kpi" data-testid="annual-return">
      <h2>{t('asset.annualReturn')}</h2>
      {#if performance.annual_return}
        <strong class="big">{formatRate(performance.annual_return)}</strong>
        <span class="quiet small">{t('asset.annualReturnLead')}</span>
      {:else}
        <span class="quiet">—</span>
      {/if}
    </div>
  </section>

  {#if account.kind === 'p2p'}
    {#if p2p}
      <P2PLoans snapshot={p2p} />
    {:else}
      <section class="panel">
        <p class="quiet">{t('p2p.empty')}</p>
        <Button href="/imports" icon="upload-simple">{t('overview.toImport')}</Button>
      </section>
    {/if}
  {/if}

  <section class="panel" data-testid="valuations">
    <h2>{t('valuation.history')}</h2>
    <ValuationForm accountId={account.id} currency={account.currency} onsaved={load} />
    {#if valuations.length > 0}
      <ul class="rows">
        {#each valuations as v (v.id)}
          <li>
            <span>{shortDate(v.valued_on)}</span>
            <span class="quiet">{v.note}</span>
            <MoneyAmount amount={v.value} whole />
            <Button variant="ghost" icon="trash" aria-label={t('valuation.delete')} onclick={() => remove(v)}
              >{t('common.delete')}</Button
            >
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="panel" data-testid="flows">
    <h2>{t('asset.flows')}</h2>
    {#if performance.flows.length === 0}
      <p class="quiet">{t('asset.noFlows')}</p>
    {:else}
      <ul class="rows">
        {#each [...performance.flows].reverse() as f, i (i)}
          <li>
            <span>{shortDate(f.on)}</span>
            <span></span>
            <MoneyAmount amount={f.amount} signed whole />
            <span></span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{:else}
  <p class="quiet">{t('common.loading')}</p>
{/if}

<style>
  .kpis {
    display: grid;
    grid-template-columns: minmax(240px, 1.5fr) repeat(3, minmax(150px, 1fr));
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
  .kpi p {
    margin: 4px 0 0;
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
  .rows {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
  }
  .rows li {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    border-top: 1px solid var(--line);
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
    .kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .kpi.main {
      grid-column: 1 / -1;
    }
  }
</style>
