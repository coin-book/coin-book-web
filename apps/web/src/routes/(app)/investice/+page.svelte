<script lang="ts">
  import { onDestroy } from 'svelte';
  import { api } from '@coin-book/core/api';
  import { shortDate } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { t } from '@coin-book/core/i18n';
  import { formatDecimal, formatPrice } from '@coin-book/core/money';
  import type { Portfolio, Position, PriceStatus, Realized } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import EmptyState from '@coin-book/ui/EmptyState.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';

  const CZK = 'CZK';
  const POLL_MS = 3000;

  let portfolio = $state<Portfolio | null>(null);
  let realized = $state<Realized | null>(null);
  let error = $state('');
  let poll: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;

  function schedule() {
    clearTimeout(poll);
    if (!destroyed) poll = setTimeout(load, POLL_MS);
  }

  async function load() {
    try {
      const [p, r] = await Promise.all([
        api.get<Portfolio>('/investments/portfolio'),
        api.get<Realized>('/investments/realized'),
      ]);
      if (destroyed) return;
      [portfolio, realized] = [p, r];
      error = '';
      if (p.prices.running) schedule();
    } catch (e) {
      error = errorText(e);
    }
  }

  $effect(() => {
    void load();
  });
  onDestroy(() => {
    destroyed = true;
    clearTimeout(poll);
  });

  async function refresh() {
    try {
      const status = await api.post<PriceStatus>('/investments/prices/refresh');
      if (portfolio) portfolio.prices = status;
      if (status.running) schedule();
    } catch (e) {
      error = errorText(e);
    }
  }

  function label(p: { instrument: Position['instrument'] }) {
    return p.instrument.ticker || p.instrument.name || p.instrument.isin;
  }

  function gainCZK(p: Position) {
    if (!p.value_czk || !p.cost_czk) return null;
    return { minor: p.value_czk.minor - p.cost_czk.minor, currency: CZK };
  }

  const isEmpty = $derived(
    portfolio !== null && portfolio.positions.length === 0 && (realized?.lots.length ?? 0) === 0,
  );
  const unrealized = $derived(
    portfolio ? { minor: portfolio.value_czk.minor - portfolio.cost_czk.minor, currency: CZK } : null,
  );
</script>

<svelte:head><title>{t('nav.investments')} · coin-book</title></svelte:head>

{#if error}
  <p class="error" role="alert">{error}</p>
{/if}

{#if portfolio && realized}
  {#if isEmpty}
    <EmptyState icon="chart-line-up" title={t('investments.emptyTitle')} lead={t('investments.emptyLead')}>
      <Button href="/importy" icon="upload-simple">{t('investments.toImport')}</Button>
    </EmptyState>
  {:else}
    <section class="hero">
      <div>
        <h2>{t('investments.value')}</h2>
        <MoneyAmount amount={portfolio.value_czk} size="hero" whole />
        <p class="quiet meta">
          {#if portfolio.rates_on}{t('investments.ratesOn', { date: shortDate(portfolio.rates_on) })}{/if}
          {#if portfolio.unvalued > 0}· {t('investments.unvalued', { count: portfolio.unvalued })}{/if}
        </p>
      </div>
      <dl class="totals">
        <div>
          <dt>{t('investments.cost')}</dt>
          <dd><MoneyAmount amount={portfolio.cost_czk} size="lg" whole /></dd>
        </div>
        {#if unrealized}
          <div>
            <dt>{t('investments.unrealized')}</dt>
            <dd><MoneyAmount amount={unrealized} size="lg" whole signed /></dd>
          </div>
        {/if}
      </dl>
    </section>

    <div class="prices" data-testid="price-status">
      {#if !portfolio.prices.enabled}
        <span class="quiet">{t('investments.pricesDisabled')}</span>
      {:else}
        <Button variant="quiet" icon="arrows-clockwise" onclick={refresh} disabled={portfolio.prices.running}>
          {portfolio.prices.running ? t('investments.refreshing') : t('investments.refresh')}
        </Button>
        {#if portfolio.prices.finished_at}
          <span class="quiet"
            >{t('investments.updatedAt', {
              date: shortDate(portfolio.prices.finished_at.slice(0, 10)),
            })}</span
          >
        {/if}
        {#if portfolio.prices.failures > 0}
          <span class="warn">{t('investments.refreshFailures', { count: portfolio.prices.failures })}</span>
        {/if}
      {/if}
    </div>

    {#if portfolio.incomplete_history.length > 0}
      <section class="notice" role="note" data-testid="incomplete-history">
        <strong>{t('investments.incompleteTitle')}</strong>
        <p>
          {t('investments.incompleteLead', {
            list: portfolio.incomplete_history.map((i) => i.ticker || i.name || i.isin).join(', '),
          })}
        </p>
      </section>
    {/if}

    {#if portfolio.positions.length > 0}
      <section class="panel">
        <h2>{t('investments.positions')}</h2>
        <div class="scroll">
          <table class="positions">
            <thead>
              <tr>
                <th>{t('investments.instrument')}</th>
                <th class="num">{t('investments.quantity')}</th>
                <th class="num">{t('investments.price')}</th>
                <th class="num">{t('investments.positionValue')}</th>
                <th class="num">{t('investments.gain')}</th>
                <th>{t('investments.timeTest')}</th>
                <th class="num">{t('investments.dividends')}</th>
              </tr>
            </thead>
            <tbody>
              {#each portfolio.positions as p (p.instrument.isin)}
                {@const gain = gainCZK(p)}
                <tr data-testid="position" data-isin={p.instrument.isin}>
                  <td>
                    <a href="/investice/{p.instrument.isin}" class="ticker">{label(p)}</a>
                    {#if p.instrument.ticker && p.instrument.name}<span class="name">{p.instrument.name}</span
                      >{/if}
                    {#if p.incomplete_history}<span class="warn badge"
                        >{t('investments.incompleteTitle')}</span
                      >{/if}
                  </td>
                  <td class="num">{formatDecimal(p.quantity, 0, 4)}</td>
                  <td class="num">
                    {#if p.quote}{formatPrice(p.quote.close, p.quote.currency)}{:else}<span class="quiet"
                        >{t('investments.noPrice')}</span
                      >{/if}
                  </td>
                  <td class="num">
                    {#if p.value_czk}<MoneyAmount amount={p.value_czk} whole />{:else if p.cost_czk}<span
                        class="quiet"><MoneyAmount amount={p.cost_czk} whole /></span
                      >{/if}
                    {#if p.value}<span class="sub"><MoneyAmount amount={p.value} size="sm" whole /></span
                      >{/if}
                  </td>
                  <td class="num"
                    >{#if gain}<MoneyAmount amount={gain} whole signed />{/if}</td
                  >
                  <td>
                    {#if !p.next_exempt_on}
                      <span class="exempt">{t('investments.allExempt')}</span>
                    {:else}
                      {t('investments.exemptFrom', { date: shortDate(p.next_exempt_on) })}
                      {#if Number(p.exempt_quantity) > 0}
                        <span class="sub"
                          >{t('investments.exemptPart', {
                            quantity: formatDecimal(p.exempt_quantity, 0, 4),
                          })}</span
                        >
                      {/if}
                    {/if}
                  </td>
                  <td class="num">
                    {#if p.dividends_net_czk.minor !== 0}<MoneyAmount
                        amount={p.dividends_net_czk}
                        whole
                      />{/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}

    {#if realized.years.length > 0}
      <section class="panel" data-testid="realized">
        <h2>{t('investments.realized')}</h2>
        <p class="quiet lead">{t('investments.realizedLead')}</p>
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th>{t('investments.year')}</th>
                <th class="num">{t('investments.exemptGain')}</th>
                <th class="num">{t('investments.taxableGain')}</th>
                <th class="num">{t('investments.taxableProceeds')}</th>
                <th class="num">{t('investments.dividendsNet')}</th>
                <th class="num">{t('investments.dividendsTax')}</th>
              </tr>
            </thead>
            <tbody>
              {#each realized.years as y (y.year)}
                <tr data-testid="realized-year" data-year={y.year}>
                  <td>
                    <strong>{y.year}</strong>
                    {#if y.missing_czk > 0}<span class="sub warn"
                        >{t('investments.missingCzk', { count: y.missing_czk })}</span
                      >{/if}
                  </td>
                  <td class="num"><MoneyAmount amount={y.exempt_gain_czk} whole signed /></td>
                  <td class="num"><MoneyAmount amount={y.taxable_gain_czk} whole signed /></td>
                  <td class="num"><MoneyAmount amount={y.taxable_proceeds_czk} whole /></td>
                  <td class="num"><MoneyAmount amount={y.dividends_net_czk} whole /></td>
                  <td class="num"><MoneyAmount amount={y.dividends_tax_czk} whole /></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <details class="panel">
        <summary><h2>{t('investments.soldLots')}</h2></summary>
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th>{t('investments.instrument')}</th>
                <th>{t('investments.boughtOn')}</th>
                <th>{t('investments.soldOn')}</th>
                <th class="num">{t('investments.quantity')}</th>
                <th class="num">{t('investments.gain')}</th>
                <th>{t('investments.timeTest')}</th>
              </tr>
            </thead>
            <tbody>
              {#each realized.lots as l, i (i)}
                <tr>
                  <td><a href="/investice/{l.instrument.isin}" class="ticker">{label(l)}</a></td>
                  <td>{shortDate(l.bought_on)}</td>
                  <td>{shortDate(l.sold_on)}</td>
                  <td class="num">{formatDecimal(l.quantity, 0, 4)}</td>
                  <td class="num">
                    {#if l.gain_czk}<MoneyAmount amount={l.gain_czk} whole signed />{:else}<MoneyAmount
                        amount={l.gain}
                        whole
                        signed
                      />{/if}
                  </td>
                  <td>
                    {#if l.exempt}<span class="exempt">{t('investments.exempt')}</span>{:else}<span
                        class="quiet">{t('investments.taxable')}</span
                      >{/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </details>
    {/if}
  {/if}
{:else if !error}
  <p class="quiet">{t('common.loading')}</p>
{/if}

<style>
  .hero {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 28px;
    margin-bottom: 18px;
  }
  .hero h2,
  .panel h2 {
    margin: 0 0 10px;
    font-size: var(--text-body);
    font-weight: 650;
    color: var(--ink-soft);
  }
  .meta {
    margin: 10px 0 0;
    font-size: var(--text-micro);
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
  .prices {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    margin-bottom: 22px;
    font-size: var(--text-micro);
  }
  .notice {
    border-left: 3px solid var(--warn);
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 14px 18px;
    margin-bottom: 18px;
  }
  .notice p {
    margin: 4px 0 0;
    color: var(--ink-soft);
  }
  .panel {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 22px 24px;
    margin-bottom: 18px;
  }
  details.panel summary {
    cursor: pointer;
    list-style: none;
  }
  details.panel summary::-webkit-details-marker {
    display: none;
  }
  details.panel summary h2 {
    display: inline-block;
    margin: 0;
  }
  details.panel summary h2::before {
    content: '▸';
    display: inline-block;
    margin-right: 8px;
    color: var(--ink-faint);
    transition: transform 160ms ease;
  }
  details.panel[open] summary h2::before {
    transform: rotate(90deg);
  }
  details.panel[open] summary {
    margin-bottom: 14px;
  }
  .lead {
    margin: -6px 0 12px;
    font-size: var(--text-micro);
    max-width: 80ch;
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    text-align: left;
    font-size: var(--text-micro);
    font-weight: 600;
    color: var(--ink-faint);
    padding: 0 12px 8px 0;
    white-space: nowrap;
  }
  td {
    padding: 10px 12px 10px 0;
    border-top: 1px solid var(--line);
    vertical-align: top;
  }
  th.num,
  td.num {
    text-align: right;
  }
  .ticker {
    color: var(--ink);
    font-weight: 650;
    text-decoration: none;
  }
  .ticker:hover {
    text-decoration: underline;
  }
  .name,
  .sub {
    display: block;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .badge {
    display: inline-block;
    margin-top: 4px;
    font-size: var(--text-micro);
  }
  .exempt {
    color: var(--income);
    font-weight: 600;
  }
  .warn {
    color: var(--ink);
    font-weight: 600;
  }
  .warn::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--warn);
    margin-right: 6px;
  }
  .quiet {
    color: var(--ink-soft);
  }
  .error {
    color: var(--over);
    font-weight: 600;
  }
</style>
