<script lang="ts">
  import { shortDate } from '@coin-book/core/dates';
  import { t, type MessageKey } from '@coin-book/core/i18n';
  import { formatDecimal, formatGainPercent, formatWhole } from '@coin-book/core/money';
  import { assetClasses, classColor, debtClasses } from '@coin-book/core/networth';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import CategoryBars, { type CategoryBar } from '@coin-book/ui/CategoryBars.svelte';
  import Icon from '@coin-book/ui/Icon.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import Sparkline from '@coin-book/ui/Sparkline.svelte';
  import type { AttentionItem } from './attention';
  import type { Wealth } from './wealth';

  let { wealth, attention }: { wealth: Wealth; attention: AttentionItem[] } = $props();

  const CZK = 'CZK';

  const w = $derived(wealth.netWorth);
  const thisMonth = $derived(wealth.trend.at(-1) ?? null);

  function classTotal(key: string) {
    return w.by_class.find((c) => c.key === key)?.value.minor ?? 0;
  }

  const bars = $derived<CategoryBar[]>(
    [...assetClasses, ...debtClasses]
      .map((c) => ({
        key: c,
        label: t(`netWorth.class.${c}` as MessageKey),
        colorKey: classColor[c],
        amountMinor: Math.abs(classTotal(c)),
        href: '/net-worth',
      }))
      .filter((b) => b.amountMinor > 0),
  );

  const gain = $derived(
    wealth.portfolio ? wealth.portfolio.value_czk.minor - wealth.portfolio.cost_czk.minor : 0,
  );

  function accountName(id: string) {
    return taxonomy.accountsById.get(id)?.name ?? '';
  }
</script>

<section class="wealth" data-testid="wealth">
  <a class="card hero" href="/net-worth" data-testid="net-worth">
    <h3>{t('overview.netWorth')}</h3>
    <MoneyAmount amount={w.total_czk} size="hero" whole />
    <div class="trend">
      {#if wealth.trend.length > 1}
        <Sparkline
          values={wealth.trend.map((m) => m.total_czk.minor)}
          label={t('netWorth.history')}
          width={160}
          height={40}
        />
      {/if}
      {#if thisMonth}
        <span class="small"
          ><MoneyAmount amount={thisMonth.change_czk} gain whole />
          {t('netWorth.thisMonth').toLowerCase()}</span
        >
      {/if}
    </div>
    <p class="small quiet">
      {t('overview.netWorthAssets', {
        assets: formatWhole(w.assets_czk.minor, CZK),
        liabilities: formatWhole(w.liabilities_czk.minor, CZK),
      })}
    </p>
  </a>

  {#if wealth.portfolio}
    <a class="card" href="/investments" data-testid="overview-investments">
      <h3>{t('nav.investments')}</h3>
      <MoneyAmount amount={wealth.portfolio.value_czk} size="lg" whole />
      <span class="small"
        ><MoneyAmount amount={{ minor: gain, currency: CZK }} gain whole />
        {formatGainPercent(gain, wealth.portfolio.cost_czk.minor)}</span
      >
    </a>
  {/if}

  {#each wealth.loans as { account, loan } (account.account_id)}
    <a class="card" href="/net-worth/{account.account_id}" data-testid="overview-loan">
      <h3>{accountName(account.account_id)}</h3>
      <MoneyAmount amount={loan.balance} size="lg" whole />
      {#if loan.next}
        <span class="small quiet"
          >{t('overview.nextInstalment', {
            date: shortDate(loan.next.due_on),
            amount: formatWhole(loan.next.interest.minor + loan.next.principal.minor, loan.balance.currency),
          })}</span
        >
      {/if}
      {#if loan.reserve}
        <span class="small quiet"
          >{t('overview.reserveOnLoan', {
            amount: formatWhole(loan.reserve.balance.minor, loan.reserve.balance.currency),
          })}</span
        >
      {/if}
      {#if loan.current?.fixed_until}
        <span class="small quiet"
          >{t('overview.fixedUntil', { date: shortDate(loan.current.fixed_until) })}</span
        >
      {/if}
    </a>
  {/each}

  <a class="card" href="/net-worth" data-testid="overview-reserve">
    <h3>{t('netWorth.reserve')}</h3>
    {#if w.reserve_months}
      <strong class="big"
        >{t('netWorth.reserveTimes', { months: formatDecimal(w.reserve_months, 0, 1) })}</strong
      >
      <span class="small quiet"
        >{t('overview.reserveSpending', { expenses: formatWhole(w.monthly_expenses_czk.minor, CZK) })}</span
      >
    {:else}
      <span class="small quiet">{t('netWorth.reserveUnknown')}</span>
    {/if}
  </a>
</section>

<div class="columns">
  <section class="panel" data-testid="overview-composition">
    <div class="panel-head">
      <h2>{t('netWorth.composition')}</h2>
      <a href="/net-worth">{t('overview.netWorthDetail')}</a>
    </div>
    {#if bars.length > 0}
      <CategoryBars {bars} currency={CZK} label={t('netWorth.composition')} />
    {:else}
      <p class="quiet">{t('netWorth.emptyLead')}</p>
    {/if}
  </section>

  <section class="panel" data-testid="attention">
    <h2>{t('attention.title')}</h2>
    {#if attention.length === 0}
      <p class="quiet calm">
        <Icon name="check-circle" size={18} weight="duotone" />
        {t('attention.allClear')}
      </p>
    {:else}
      <ul class="attention">
        {#each attention as item (item.key)}
          <li class={item.level} data-testid="attention-item" data-level={item.level}>
            <Icon name={item.icon} size={18} weight="duotone" />
            <a href={item.href}>{item.text}</a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .wealth {
    display: grid;
    grid-template-columns: minmax(260px, 1.6fr) repeat(auto-fit, minmax(170px, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 18px 20px;
    color: inherit;
    text-decoration: none;
  }
  a.card:hover {
    box-shadow: var(--glow);
  }
  .card h3 {
    margin: 0 0 4px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-faint);
  }
  .trend {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
  }
  .big {
    font-size: var(--text-title);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .small {
    font-size: var(--text-micro);
  }
  .quiet {
    color: var(--ink-soft);
  }
  .card p {
    margin: 6px 0 0;
  }
  .columns {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: 18px;
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
    justify-content: space-between;
    align-items: baseline;
  }
  .panel-head a {
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--brand);
    text-decoration: none;
  }
  .attention {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }
  .attention li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    color: var(--ink-soft);
  }
  .attention li.warn {
    background: color-mix(in oklch, var(--warn) 16%, transparent);
    color: var(--ink);
  }
  .attention a {
    color: inherit;
    text-decoration: none;
  }
  .attention a:hover {
    text-decoration: underline;
  }
  .calm {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
  }
  @media (max-width: 1100px) {
    .wealth {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .hero {
      grid-column: 1 / -1;
    }
    .columns {
      grid-template-columns: 1fr;
    }
  }
</style>
