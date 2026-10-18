<script lang="ts">
  import { onDestroy } from 'svelte';
  import { page } from '$app/state';
  import { api } from '@coin-book/core/api';
  import { shiftMonth, shortDate, todayISO } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { apiErrorMessage, t } from '@coin-book/core/i18n';
  import { formatDecimal, formatPrice } from '@coin-book/core/money';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import { toasts } from '@coin-book/core/toast';
  import type { CandleList, InstrumentDetail, PriceStatus } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import CandleChart, { type CandleMarker } from '@coin-book/ui/CandleChart.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';

  const ranges = [
    { key: '3m', months: 3 },
    { key: '1y', months: 12 },
    { key: '3y', months: 36 },
    { key: 'all', months: null },
  ] as const;
  type RangeKey = (typeof ranges)[number]['key'];
  const POLL_MS = 3000;

  const isin = $derived(page.params.isin ?? '');

  let detail = $state<InstrumentDetail | null>(null);
  let candles = $state<CandleList | null>(null);
  let range = $state<RangeKey>('1y');
  let symbol = $state('');
  let saving = $state(false);
  let error = $state('');

  function rangeStart(key: RangeKey, d: InstrumentDetail) {
    const months = ranges.find((r) => r.key === key)?.months;
    if (months) return `${shiftMonth(todayISO().slice(0, 7), -months)}-01`;
    const days = [...d.trades.map((tr) => tr.day), ...d.sales.map((s) => s.bought_on)].sort();
    return days[0] ?? todayISO();
  }

  let candlesRequest = 0;
  let poll: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;

  async function loadDetail(forIsin: string, { keepSymbol = false } = {}) {
    try {
      const d = await api.get<InstrumentDetail>(`/investments/instruments/${encodeURIComponent(forIsin)}`);
      if (forIsin !== isin) return;
      detail = d;
      if (!keepSymbol) symbol = d.instrument.yahoo_symbol ?? '';
      error = '';
    } catch (e) {
      error = errorText(e);
    }
  }

  /** Only the latest request may land: a slow answer for an earlier range must not win. */
  async function loadCandles(d: InstrumentDetail, key: RangeKey) {
    const request = ++candlesRequest;
    try {
      const list = await api.get<CandleList>(
        `/investments/instruments/${encodeURIComponent(d.instrument.isin)}/candles`,
        { from: rangeStart(key, d) },
      );
      if (request === candlesRequest) candles = list;
    } catch (e) {
      error = errorText(e);
    }
  }

  const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

  $effect(() => {
    const forIsin = isin;
    detail = null;
    candles = null;
    if (!ISIN_PATTERN.test(forIsin)) {
      error = apiErrorMessage('not_found');
      return;
    }
    void loadDetail(forIsin);
  });
  $effect(() => {
    const key = range;
    if (detail) void loadCandles(detail, key);
  });
  onDestroy(() => {
    destroyed = true;
    clearTimeout(poll);
  });

  /** After a symbol change prices arrive in the background; reload the chart once they have. */
  async function awaitPrices() {
    clearTimeout(poll);
    if (destroyed) return;
    try {
      const status = await api.get<PriceStatus>('/investments/prices/status');
      if (status.running) poll = setTimeout(awaitPrices, POLL_MS);
      // A new detail reloads the candles through the effect.
      else await loadDetail(isin, { keepSymbol: true });
    } catch (e) {
      error = errorText(e);
    }
  }

  async function saveSymbol(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    try {
      detail = await api.put<InstrumentDetail>(
        `/investments/instruments/${encodeURIComponent(isin)}/yahoo-symbol`,
        { symbol: symbol.trim() },
      );
      toasts.show(t('investments.symbolSaved'), 'success');
      clearTimeout(poll);
      poll = setTimeout(awaitPrices, POLL_MS);
    } catch (err) {
      toasts.show(errorText(err), 'error');
    } finally {
      saving = false;
    }
  }

  const markers = $derived<CandleMarker[]>([
    ...(detail?.trades ?? [])
      .filter((tr) => tr.kind === 'buy')
      .map((tr) => ({ day: tr.day, kind: 'buy' as const })),
    ...[...new Set((detail?.sales ?? []).map((s) => s.sold_on))].map((day) => ({
      day,
      kind: 'sell' as const,
    })),
  ]);
  const title = $derived(detail ? detail.instrument.ticker || detail.instrument.name || isin : isin);
  const position = $derived(detail?.position ?? null);
  const gain = $derived(
    position?.value_czk && position.cost_czk
      ? { minor: position.value_czk.minor - position.cost_czk.minor, currency: 'CZK' }
      : null,
  );
</script>

<svelte:head><title>{title} · {t('nav.investments')} · coin-book</title></svelte:head>

<a class="back" href="/investice">← {t('investments.back')}</a>

{#if error}
  <p class="error" role="alert">{error}</p>
{/if}

{#if detail}
  <header class="head">
    <div>
      <h1>{title}</h1>
      <p class="quiet">
        {#if detail.instrument.ticker && detail.instrument.name}{detail.instrument.name} ·{/if}
        {detail.instrument.isin} · {detail.instrument.currency}
      </p>
    </div>
    {#if position}
      <dl class="totals">
        <div>
          <dt>{t('investments.quantity')}</dt>
          <dd class="num big">{formatDecimal(position.quantity, 0, 4)}</dd>
        </div>
        {#if position.quote}
          <div>
            <dt>{t('investments.price')} · {shortDate(position.quote.day)}</dt>
            <dd class="num big">{formatPrice(position.quote.close, position.quote.currency)}</dd>
          </div>
        {/if}
        {#if position.value_czk}
          <div>
            <dt>{t('investments.positionValue')}</dt>
            <dd><MoneyAmount amount={position.value_czk} size="lg" whole /></dd>
          </div>
        {/if}
        {#if gain}
          <div>
            <dt>{t('investments.gain')}</dt>
            <dd><MoneyAmount amount={gain} size="lg" whole signed /></dd>
          </div>
        {/if}
      </dl>
    {:else}
      <p class="quiet">{t('investments.soldOut')}</p>
    {/if}
  </header>

  <section class="panel" data-testid="candles">
    <div class="panel-head">
      <h2>{t('investments.chart')}</h2>
      <div class="ranges" role="group" aria-label={t('investments.chart')}>
        {#each ranges as r (r.key)}
          <button type="button" aria-pressed={range === r.key} onclick={() => (range = r.key)}
            >{t(`investments.range.${r.key}`)}</button
          >
        {/each}
      </div>
    </div>
    {#if !detail.instrument.yahoo_symbol}
      <p class="quiet">{t('investments.noSymbol')}</p>
    {:else if candles && candles.candles.length === 0}
      <p class="quiet">{t('investments.noCandles')}</p>
    {:else if candles}
      <CandleChart
        candles={candles.candles}
        {markers}
        currency={candles.currency}
        label="{title} – {t('investments.chart')}"
        labels={{
          open: t('investments.candle.open'),
          high: t('investments.candle.high'),
          low: t('investments.candle.low'),
          close: t('investments.candle.close'),
          buy: t('investments.buy'),
          sell: t('investments.sell'),
          rising: t('investments.candle.rising'),
          falling: t('investments.candle.falling'),
          table: t('investments.asTable'),
        }}
      />
    {/if}
    <form class="symbol" onsubmit={saveSymbol}>
      <label>
        <span>{t('investments.symbol')}</span>
        <input bind:value={symbol} maxlength="20" autocomplete="off" spellcheck="false" />
      </label>
      <Button type="submit" variant="quiet" disabled={saving}>{t('common.save')}</Button>
      <p class="quiet hint">{t('investments.symbolHint')}</p>
    </form>
  </section>

  {#if position && position.lots.length > 0}
    <section class="panel">
      <h2>{t('investments.openLots')}</h2>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>{t('investments.boughtOn')}</th>
              <th class="num">{t('investments.quantity')}</th>
              <th class="num">{t('investments.cost.short')}</th>
              <th>{t('investments.timeTest')}</th>
            </tr>
          </thead>
          <tbody>
            {#each position.lots as lot, i (i)}
              <tr data-testid="open-lot">
                <td>
                  {shortDate(lot.bought_on)}
                  <span class="sub">{taxonomy.accountsById.get(lot.account_id)?.name ?? ''}</span>
                </td>
                <td class="num">{formatDecimal(lot.quantity, 0, 8)}</td>
                <td class="num">
                  <MoneyAmount amount={lot.cost} />
                  {#if lot.cost_czk}<span class="sub"
                      ><MoneyAmount amount={lot.cost_czk} size="sm" whole /></span
                    >{/if}
                </td>
                <td>
                  {#if lot.exempt_from <= todayISO()}
                    <span class="exempt">{t('investments.exempt')}</span>
                  {:else}
                    {t('investments.exemptFrom', { date: shortDate(lot.exempt_from) })}
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  {#if detail.trades.length > 0}
    <section class="panel">
      <h2>{t('investments.trades')}</h2>
      <div class="scroll">
        <table>
          <tbody>
            {#each [...detail.trades].reverse() as tr, i (i)}
              <tr>
                <td>{shortDate(tr.day)}</td>
                <td>{tr.kind === 'buy' ? t('investments.buy') : t('investments.dividend')}</td>
                <td class="num">{tr.quantity ? formatDecimal(tr.quantity, 0, 8) : ''}</td>
                <td class="num">
                  <MoneyAmount amount={tr.net} signed={tr.kind === 'dividend'} />
                  {#if tr.net_czk}<span class="sub"><MoneyAmount amount={tr.net_czk} size="sm" whole /></span
                    >{/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  {#if detail.sales.length > 0}
    <section class="panel">
      <h2>{t('investments.soldLots')}</h2>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>{t('investments.boughtOn')}</th>
              <th>{t('investments.soldOn')}</th>
              <th class="num">{t('investments.quantity')}</th>
              <th class="num">{t('investments.gain')}</th>
              <th>{t('investments.timeTest')}</th>
            </tr>
          </thead>
          <tbody>
            {#each [...detail.sales].reverse() as s, i (i)}
              <tr>
                <td>{shortDate(s.bought_on)}</td>
                <td>{shortDate(s.sold_on)}</td>
                <td class="num">{formatDecimal(s.quantity, 0, 8)}</td>
                <td class="num">
                  <MoneyAmount amount={s.gain} signed />
                  {#if s.gain_czk}<span class="sub"
                      ><MoneyAmount amount={s.gain_czk} size="sm" whole signed /></span
                    >{/if}
                </td>
                <td>
                  {#if s.exempt}<span class="exempt">{t('investments.exempt')}</span>{:else}<span
                      class="quiet">{t('investments.taxable')}</span
                    >{/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
{/if}

<style>
  .back {
    display: inline-block;
    margin-bottom: 14px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--brand);
    text-decoration: none;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px 28px;
    margin-bottom: 22px;
  }
  h1 {
    margin: 0;
    font-size: var(--text-headline);
  }
  .head p {
    margin: 4px 0 0;
  }
  .totals {
    display: flex;
    flex-wrap: wrap;
    gap: 14px clamp(18px, 4vw, 40px);
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
  .big {
    font-size: var(--text-lead);
    font-weight: 600;
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
  .panel-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .ranges {
    display: flex;
    gap: 4px;
  }
  .ranges button {
    border: 0;
    background: none;
    padding: 4px 10px;
    border-radius: 999px;
    font: inherit;
    font-size: var(--text-micro);
    color: var(--ink-soft);
    cursor: pointer;
  }
  .ranges button[aria-pressed='true'] {
    background: color-mix(in oklch, var(--brand) 14%, transparent);
    color: var(--ink);
    font-weight: 650;
  }
  .symbol {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 8px 12px;
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
  }
  .symbol label {
    display: grid;
    gap: 4px;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .symbol input {
    width: 14ch;
    padding: 9px 11px;
    border-radius: var(--radius-input);
    border: 1.5px solid var(--line);
    background: var(--canvas);
    color: var(--ink);
    font: inherit;
    font-size: var(--text-body);
    font-weight: 500;
    text-transform: uppercase;
  }
  .symbol input:focus {
    border-color: var(--brand);
    outline: none;
  }
  .hint {
    flex-basis: 100%;
    margin: 0;
    font-size: var(--text-micro);
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
  .sub {
    display: block;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .exempt {
    color: var(--income);
    font-weight: 600;
  }
  .quiet {
    color: var(--ink-soft);
  }
  .error {
    color: var(--over);
    font-weight: 600;
  }
</style>
