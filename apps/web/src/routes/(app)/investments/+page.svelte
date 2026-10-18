<script lang="ts">
  import { onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { api } from '@coin-book/core/api';
  import { shortDate } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { pluralKey, t, type MessageKey } from '@coin-book/core/i18n';
  import { colorVar } from '@coin-book/core/colors';
  import { formatDecimal, formatGainPercent, formatPrice } from '@coin-book/core/money';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import type { Portfolio, Position, PriceStatus, Realized } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import EmptyState from '@coin-book/ui/EmptyState.svelte';
  import Icon from '@coin-book/ui/Icon.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import Sparkline from '@coin-book/ui/Sparkline.svelte';

  const CZK = 'CZK';
  const POLL_MS = 3000;
  const FALLBACK_COLORS = ['chrpa', 'mandarinka', 'laguna', 'malina', 'smaragd', 'ametyst'];

  /** The `group` URL parameter; without it, positions are grouped per account. */
  const groupings = [
    { param: 'none', key: 'none' },
    { param: '', key: 'account' },
    { param: 'broker', key: 'broker' },
  ] as const;
  type Grouping = (typeof groupings)[number];
  const perAccount = groupings[1];
  const grouping = $derived<Grouping>(
    groupings.find((g) => g.param === (page.url.searchParams.get('group') ?? '')) ?? perAccount,
  );

  /** The `tab` URL parameter; without it, positions. */
  const tabs = [
    { param: '', key: 'positions' },
    { param: 'realized', key: 'realized' },
    { param: 'dividends', key: 'dividends' },
    { param: 'time-test', key: 'timeTest' },
  ] as const;
  type Tab = (typeof tabs)[number];
  const tab = $derived<Tab>(
    tabs.find((x) => x.param === (page.url.searchParams.get('tab') ?? '')) ?? tabs[0],
  );

  function setParam(name: string, value: string) {
    const url = new URL(page.url);
    if (value) url.searchParams.set(name, value);
    else url.searchParams.delete(name);
    void goto(url, { replaceState: true, noScroll: true, keepFocus: true });
  }

  function groupBy(g: Grouping) {
    const url = new URL(page.url);
    if (g.param) url.searchParams.set('group', g.param);
    else url.searchParams.delete('group');
    void goto(url, { replaceState: true, noScroll: true, keepFocus: true });
  }

  let portfolio = $state<Portfolio | null>(null);
  /** Positions per account, for the allocation bar whatever the grouping. */
  let byAccount = $state<Portfolio | null>(null);
  let realized = $state<Realized | null>(null);
  let error = $state('');
  let poll: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;

  function schedule() {
    clearTimeout(poll);
    if (!destroyed) poll = setTimeout(load, POLL_MS);
  }

  async function load() {
    const perAccount = grouping.key !== 'none';
    try {
      const [p, r, a] = await Promise.all([
        api.get<Portfolio>('/investments/portfolio', { per_account: perAccount }),
        api.get<Realized>('/investments/realized'),
        perAccount ? null : api.get<Portfolio>('/investments/portfolio', { per_account: true }),
      ]);
      if (destroyed || perAccount !== (grouping.key !== 'none')) return;
      [portfolio, realized, byAccount] = [p, r, a ?? p];
      error = '';
      if (p.prices.running) schedule();
    } catch (e) {
      error = errorText(e);
    }
  }

  $effect(() => {
    void grouping;
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

  function instrumentsCount(n: number) {
    return t(`investments.positionsCount.${pluralKey(n)}` as MessageKey, { count: n });
  }

  function label(p: { instrument: Position['instrument'] }) {
    return p.instrument.ticker || p.instrument.name || p.instrument.isin;
  }

  function gainCZK(p: Position) {
    if (!p.value_czk || !p.cost_czk) return null;
    return { minor: p.value_czk.minor - p.cost_czk.minor, currency: CZK };
  }

  type PositionGroup = {
    key: string;
    label: string;
    detail: string;
    /** The account's colour key; none for a broker. */
    colorKey?: string | null;
    positions: Position[];
    value: number;
    cost: number;
    gain: number;
  };

  function brokerOf(accountId: string | null | undefined) {
    const account = accountId ? taxonomy.accountsById.get(accountId) : undefined;
    const name = account?.bank_id ? taxonomy.bankName(account.bank_id) : (account?.institution ?? '');
    return { key: account?.bank_id ?? account?.institution ?? '', name };
  }

  /** Groups with their value and gain in CZK, over the positions that have both. */
  const groups = $derived.by<PositionGroup[]>(() => {
    const positions = portfolio?.positions ?? [];
    if (grouping.key === 'none')
      return [{ key: '', label: '', detail: '', positions, value: 0, cost: 0, gain: 0 }];
    const byKey = new Map<string, PositionGroup>();
    for (const p of positions) {
      const account = p.account_id ? taxonomy.accountsById.get(p.account_id) : undefined;
      const broker = brokerOf(p.account_id);
      const [key, label, detail] =
        grouping.key === 'account'
          ? [p.account_id ?? '', account?.name ?? '', broker.name]
          : [broker.key, broker.name, ''];
      let group = byKey.get(key);
      if (!group) {
        group = {
          key,
          label,
          detail,
          colorKey: grouping.key === 'account' ? account?.color_key : undefined,
          positions: [],
          value: 0,
          cost: 0,
          gain: 0,
        };
        byKey.set(key, group);
      }
      group.positions.push(p);
      const gain = gainCZK(p);
      if (p.value_czk && p.cost_czk && gain) {
        group.value += p.value_czk.minor;
        group.cost += p.cost_czk.minor;
        group.gain += gain.minor;
      }
    }
    const sorted = [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
    // Groups without an account colour take one in a fixed order, so neighbouring cards differ.
    sorted.forEach((g, i) => (g.colorKey ||= FALLBACK_COLORS[i % FALLBACK_COLORS.length]));
    return sorted;
  });

  function gainPercent(p: Position) {
    const gain = gainCZK(p);
    return gain && p.cost_czk ? formatGainPercent(gain.minor, p.cost_czk.minor) : '';
  }

  function accountColor(accountId: string | null | undefined, index: number) {
    const account = accountId ? taxonomy.accountsById.get(accountId) : undefined;
    return account?.color_key || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  }

  /** Each account's share of the valued portfolio, largest first. */
  const allocation = $derived.by(() => {
    const totals = new Map<string, number>();
    for (const p of byAccount?.positions ?? []) {
      if (p.value_czk && p.account_id)
        totals.set(p.account_id, (totals.get(p.account_id) ?? 0) + p.value_czk.minor);
    }
    const sum = [...totals.values()].reduce((a, b) => a + b, 0);
    const ordered = [...totals.entries()].sort((a, b) =>
      (taxonomy.accountsById.get(a[0])?.name ?? '').localeCompare(
        taxonomy.accountsById.get(b[0])?.name ?? '',
      ),
    );
    return ordered
      .map(([id, value], i) => ({
        id,
        name: taxonomy.accountsById.get(id)?.name ?? '',
        color: colorVar(accountColor(id, i)),
        share: sum > 0 ? (value / sum) * 100 : 0,
      }))
      .sort((a, b) => b.share - a.share);
  });

  const thisYear = new Date().getFullYear();
  const yearGains = $derived(realized?.years.find((y) => y.year === thisYear) ?? null);

  /** Open lots across the portfolio, the one passing the time test soonest first. */
  const openLots = $derived(
    (byAccount?.positions ?? [])
      .flatMap((p) => p.lots.map((lot) => ({ position: p, lot })))
      .sort((a, b) => a.lot.exempt_from.localeCompare(b.lot.exempt_from)),
  );
  const today = new Date().toISOString().slice(0, 10);

  /** How much of the time to the exemption has passed, 0–100. */
  function timeTestProgress(boughtOn: string, exemptFrom: string) {
    const start = Date.parse(boughtOn);
    const end = Date.parse(exemptFrom);
    return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
  }

  function exemptShare(p: Position) {
    const total = Number(p.quantity);
    return total > 0 ? Math.min(100, (Number(p.exempt_quantity) / total) * 100) : 0;
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
      <Button href="/imports" icon="upload-simple">{t('investments.toImport')}</Button>
    </EmptyState>
  {:else}
    <section class="kpis" data-testid="kpis">
      <div class="kpi main">
        <h2>{t('investments.value')}</h2>
        <MoneyAmount amount={portfolio.value_czk} size="hero" whole />
        <p class="quiet meta">
          {t('investments.cost')}
          <MoneyAmount amount={portfolio.cost_czk} size="sm" whole />
          {#if portfolio.unvalued > 0}· {t('investments.unvalued', { count: portfolio.unvalued })}{/if}
        </p>
      </div>
      {#if unrealized}
        <div class="kpi">
          <h2>{t('investments.unrealized')}</h2>
          <MoneyAmount amount={unrealized} size="lg" whole gain />
          <span class="change" class:up={unrealized.minor > 0} class:down={unrealized.minor < 0}
            >{formatGainPercent(unrealized.minor, portfolio.cost_czk.minor)}</span
          >
        </div>
      {/if}
      <div class="kpi">
        <h2>{t('investments.dividendsYear', { year: thisYear })}</h2>
        <MoneyAmount amount={yearGains?.dividends_net_czk ?? { minor: 0, currency: CZK }} size="lg" whole />
        {#if yearGains && yearGains.dividends_tax_czk.minor > 0}
          <span class="quiet small"
            >{t('investments.dividendsTax')}
            <MoneyAmount amount={yearGains.dividends_tax_czk} size="sm" whole /></span
          >
        {/if}
      </div>
      <div class="kpi">
        <h2>{t('investments.realizedYear', { year: thisYear })}</h2>
        <MoneyAmount amount={yearGains?.gain_czk ?? { minor: 0, currency: CZK }} size="lg" whole gain />
        {#if yearGains && yearGains.exempt_gain_czk.minor !== 0}
          <span class="quiet small"
            >{t('investments.exemptGain')}
            <MoneyAmount amount={yearGains.exempt_gain_czk} size="sm" whole /></span
          >
        {/if}
      </div>
    </section>

    {#if allocation.length > 1}
      <section class="allocation" aria-label={t('investments.allocation')}>
        <div class="bar">
          {#each allocation as a (a.id)}
            <span style:width="{a.share}%" style:background={a.color} title="{a.name} {Math.round(a.share)} %"
            ></span>
          {/each}
        </div>
        <ul class="legend">
          {#each allocation as a (a.id)}
            <li>
              <i style:background={a.color}></i>{a.name} <strong class="num">{Math.round(a.share)} %</strong>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

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
        {#if portfolio.rates_on}<span class="quiet"
            >{t('investments.ratesOn', { date: shortDate(portfolio.rates_on) })}</span
          >{/if}
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

    <nav class="tabs" aria-label={t('nav.investments')}>
      {#each tabs as x (x.key)}
        <button
          type="button"
          role="tab"
          aria-selected={tab.key === x.key}
          onclick={() => setParam('tab', x.param)}>{t(`investments.tab.${x.key}`)}</button
        >
      {/each}
    </nav>

    {#if tab.key === 'positions'}
      {#if portfolio.positions.length > 0}
        <div class="positions-head">
          <div class="grouping" role="group" aria-label={t('investments.groupBy')}>
            {#each groupings as g (g.key)}
              <button type="button" aria-pressed={grouping.key === g.key} onclick={() => groupBy(g)}
                >{t(`investments.group.${g.key}`)}</button
              >
            {/each}
          </div>
        </div>
        {#each groups as group (group.key)}
          <section
            class="panel positions-panel"
            class:grouped={grouping.key !== 'none'}
            style:--accent={group.colorKey ? colorVar(group.colorKey) : 'var(--ink-faint)'}
            data-testid={grouping.key !== 'none' ? 'position-group' : undefined}
          >
            {#if grouping.key !== 'none'}
              <header class="group-head">
                <span class="group-icon" aria-hidden="true">
                  <Icon
                    name={grouping.key === 'account' ? 'chart-line-up' : 'bank'}
                    size={20}
                    weight="duotone"
                  />
                </span>
                <div class="group-name">
                  <h3>{group.label}</h3>
                  <span class="quiet"
                    >{[group.detail, instrumentsCount(group.positions.length)]
                      .filter(Boolean)
                      .join(' · ')}</span
                  >
                </div>
                <div class="group-totals">
                  <MoneyAmount amount={{ minor: group.value, currency: CZK }} size="lg" whole />
                  <span>
                    <MoneyAmount amount={{ minor: group.gain, currency: CZK }} whole gain />
                    <span class="change" class:up={group.gain > 0} class:down={group.gain < 0}
                      >{formatGainPercent(group.gain, group.cost)}</span
                    >
                  </span>
                </div>
              </header>
            {/if}
            <ul class="rows">
              {#each group.positions as p (p.instrument.isin + (p.account_id ?? ''))}
                {@const gain = gainCZK(p)}
                {@const share = exemptShare(p)}
                <li data-testid="position" data-isin={p.instrument.isin}>
                  <a href="/investments/{p.instrument.isin}" class="row">
                    <span class="who">
                      <strong class="ticker">{label(p)}</strong>
                      <span class="quiet small"
                        >{[
                          p.instrument.ticker ? p.instrument.name : '',
                          t('investments.pieces', { quantity: formatDecimal(p.quantity, 0, 4) }),
                          p.quote ? formatPrice(p.quote.close, p.quote.currency) : t('investments.noPrice'),
                        ]
                          .filter(Boolean)
                          .join(' · ')}</span
                      >
                      {#if p.incomplete_history}<span class="warn small"
                          >{t('investments.incompleteTitle')}</span
                        >{/if}
                    </span>
                    <span class="trend">
                      <Sparkline
                        values={p.trend.map(Number)}
                        label={t('investments.trendLabel', { ticker: label(p) })}
                      />
                    </span>
                    <span class="value num">
                      {#if p.value_czk}<MoneyAmount amount={p.value_czk} whole />{:else if p.cost_czk}<span
                          class="quiet"><MoneyAmount amount={p.cost_czk} whole /></span
                        >{/if}
                      {#if p.value}<span class="quiet small"
                          ><MoneyAmount amount={p.value} size="sm" whole /></span
                        >{/if}
                    </span>
                    <span class="gain num">
                      {#if gain}<MoneyAmount amount={gain} whole gain />
                        <span class="change" class:up={gain.minor > 0} class:down={gain.minor < 0}
                          >{gainPercent(p)}</span
                        >{/if}
                    </span>
                    <span class="test">
                      <span class="meter" aria-hidden="true"><i style:width="{share}%"></i></span>
                      <span class="small"
                        >{#if !p.next_exempt_on}<span class="exempt">{t('investments.allExempt')}</span
                          >{:else if share > 0}{t('investments.exemptPartOf', {
                            done: formatDecimal(p.exempt_quantity, 0, 4),
                            total: formatDecimal(p.quantity, 0, 4),
                          })} · {t('investments.exemptFrom', { date: shortDate(p.next_exempt_on) })}{:else}{t(
                            'investments.exemptFrom',
                            { date: shortDate(p.next_exempt_on) },
                          )}{/if}</span
                      >
                    </span>
                  </a>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      {/if}
    {:else if tab.key === 'realized'}
      <section class="panel" data-testid="realized">
        <p class="quiet lead">{t('investments.realizedLead')}</p>
        {#if realized.years.length === 0}
          <p class="quiet">{t('investments.nothingSold')}</p>
        {:else}
          <div class="scroll">
            <table>
              <thead>
                <tr>
                  <th>{t('investments.year')}</th>
                  <th class="num">{t('investments.exemptGain')}</th>
                  <th class="num">{t('investments.taxableGain')}</th>
                  <th class="num">{t('investments.taxableProceeds')}</th>
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
                    <td class="num"><MoneyAmount amount={y.exempt_gain_czk} whole gain /></td>
                    <td class="num"><MoneyAmount amount={y.taxable_gain_czk} whole gain /></td>
                    <td class="num"><MoneyAmount amount={y.taxable_proceeds_czk} whole /></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <h3 class="sub-title">{t('investments.soldLots')}</h3>
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
                    <td><a href="/investments/{l.instrument.isin}" class="ticker">{label(l)}</a></td>
                    <td>{shortDate(l.bought_on)}</td>
                    <td>{shortDate(l.sold_on)}</td>
                    <td class="num">{formatDecimal(l.quantity, 0, 4)}</td>
                    <td class="num">
                      {#if l.gain_czk}<MoneyAmount amount={l.gain_czk} whole gain />{:else}<MoneyAmount
                          amount={l.gain}
                          whole
                          gain
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
        {/if}
      </section>
    {:else if tab.key === 'dividends'}
      <section class="panel" data-testid="dividends">
        {#if !realized.years.some((y) => y.dividends_gross_czk.minor > 0)}
          <p class="quiet">{t('investments.noDividends')}</p>
        {:else}
          <table>
            <thead>
              <tr>
                <th>{t('investments.year')}</th>
                <th class="num">{t('investments.dividendsGross')}</th>
                <th class="num">{t('investments.dividendsTax')}</th>
                <th class="num">{t('investments.dividendsNet')}</th>
              </tr>
            </thead>
            <tbody>
              {#each realized.years.filter((y) => y.dividends_gross_czk.minor > 0) as y (y.year)}
                <tr>
                  <td><strong>{y.year}</strong></td>
                  <td class="num"><MoneyAmount amount={y.dividends_gross_czk} whole /></td>
                  <td class="num"><MoneyAmount amount={y.dividends_tax_czk} whole /></td>
                  <td class="num"><MoneyAmount amount={y.dividends_net_czk} whole /></td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </section>
    {:else}
      <section class="panel" data-testid="time-test">
        <p class="quiet lead">{t('investments.timeTestLead')}</p>
        <ul class="lots">
          {#each openLots as { position, lot }, i (i)}
            {@const done = lot.exempt_from <= today}
            <li>
              <a href="/investments/{position.instrument.isin}" class="ticker">{label(position)}</a>
              <span class="quiet small"
                >{taxonomy.accountsById.get(lot.account_id)?.name ?? ''} · {t('investments.pieces', {
                  quantity: formatDecimal(lot.quantity, 0, 4),
                })} · {t('investments.boughtOn')}
                {shortDate(lot.bought_on)}</span
              >
              <span class="meter wide" aria-hidden="true"
                ><i style:width="{timeTestProgress(lot.bought_on, lot.exempt_from)}%"></i></span
              >
              <span class="small"
                >{#if done}<span class="exempt">{t('investments.exempt')}</span>{:else}{t(
                    'investments.exemptFrom',
                    {
                      date: shortDate(lot.exempt_from),
                    },
                  )}{/if}</span
              >
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}
{:else if !error}
  <p class="quiet">{t('common.loading')}</p>
{/if}

<style>
  .kpis {
    display: grid;
    grid-template-columns: minmax(240px, 1.6fr) repeat(3, minmax(160px, 1fr));
    gap: 14px;
    margin-bottom: 14px;
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
  .meta {
    margin: 6px 0 0;
    font-size: var(--text-micro);
  }
  .small {
    font-size: var(--text-micro);
  }
  .allocation {
    margin: 0 0 14px;
  }
  .allocation .bar {
    display: flex;
    gap: 2px;
    height: 10px;
    border-radius: 5px;
    overflow: hidden;
  }
  .allocation .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 18px;
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .allocation .legend i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    margin-right: 6px;
    vertical-align: -1px;
  }
  .allocation .legend strong {
    color: var(--ink);
    margin-left: 4px;
  }
  .prices {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    margin-bottom: 18px;
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
  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 14px;
    box-shadow: inset 0 -1px 0 var(--line);
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
  }
  .tabs button {
    border: 0;
    background: none;
    padding: 10px 14px;
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
  .positions-head {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 10px;
  }
  .grouping {
    display: flex;
    gap: 4px;
  }
  .grouping button {
    border: 0;
    background: none;
    padding: 4px 10px;
    border-radius: 999px;
    font: inherit;
    font-size: var(--text-micro);
    color: var(--ink-soft);
    cursor: pointer;
  }
  .grouping button[aria-pressed='true'] {
    background: color-mix(in oklch, var(--brand) 14%, transparent);
    color: var(--ink);
    font-weight: 650;
  }
  .panel {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 20px 22px;
    margin-bottom: 16px;
  }
  /* Each account or broker is a card of its own, marked by the account's colour. */
  .positions-panel.grouped {
    border-left: 5px solid var(--accent);
  }
  .group-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 18px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--line);
  }
  .group-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    color: var(--accent);
    background: color-mix(in oklch, var(--accent) 16%, transparent);
  }
  .group-name {
    flex: 1 1 200px;
  }
  .group-name h3 {
    margin: 0 0 2px;
    font-size: var(--text-lead);
  }
  .group-name span {
    font-size: var(--text-micro);
  }
  .group-totals {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .rows li + li {
    border-top: 1px solid var(--line);
  }
  .row {
    display: grid;
    grid-template-columns: minmax(150px, 1.5fr) 110px minmax(110px, 1fr) minmax(120px, 1fr) minmax(
        150px,
        1.1fr
      );
    align-items: center;
    gap: 6px 18px;
    padding: 12px 6px;
    color: inherit;
    text-decoration: none;
    border-radius: 10px;
  }
  .row:hover,
  .row:focus-visible {
    background: color-mix(in oklch, var(--ink) 4%, transparent);
  }
  .who,
  .value,
  .gain,
  .test {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .who .small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .value,
  .gain {
    align-items: flex-end;
  }
  .ticker {
    color: var(--ink);
    font-weight: 650;
    text-decoration: none;
  }
  a.ticker:hover {
    text-decoration: underline;
  }
  .meter {
    display: block;
    height: 6px;
    width: 100%;
    max-width: 160px;
    border-radius: 3px;
    background: var(--line);
    overflow: hidden;
  }
  .meter.wide {
    max-width: none;
  }
  .meter i {
    display: block;
    height: 100%;
    background: var(--income);
  }
  .change {
    font-size: var(--text-micro);
    font-weight: 600;
    color: var(--ink-soft);
  }
  .change.up {
    color: var(--income);
  }
  .change.down {
    color: var(--loss);
  }
  .lead {
    margin: 0 0 12px;
    font-size: var(--text-micro);
    max-width: 80ch;
  }
  .sub-title {
    margin: 22px 0 8px;
    font-size: var(--text-body);
    color: var(--ink-soft);
  }
  .lots {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .lots li {
    display: grid;
    grid-template-columns: 90px minmax(160px, 1.4fr) minmax(120px, 1fr) 130px;
    align-items: center;
    gap: 6px 16px;
    padding: 10px 0;
    border-top: 1px solid var(--line);
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
  .sub {
    display: block;
    font-size: var(--text-micro);
    color: var(--ink-soft);
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
  @media (max-width: 1100px) {
    .kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .kpi.main,
    .kpi:last-child:nth-child(even) {
      grid-column: 1 / -1;
    }
  }
  @media (max-width: 720px) {
    .row {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .trend {
      display: none;
    }
    .test {
      grid-column: 1 / -1;
    }
    .lots li {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .group-totals {
      align-items: flex-start;
    }
  }
</style>
