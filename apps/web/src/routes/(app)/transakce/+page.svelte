<script lang="ts">
  import { tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { api } from '@coin-book/core/api';
  import { dayLabel, shiftDay, todayISO } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { categoryName, i18n, t } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import type { Transaction } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import EmptyState from '@coin-book/ui/EmptyState.svelte';
  import Icon from '@coin-book/ui/Icon.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import TransactionRow from '@coin-book/ui/TransactionRow.svelte';
  import { categorize, confirmAutomatic } from '$lib/categorize';
  import OwnTransferAction from '$lib/OwnTransferAction.svelte';

  const PAGE_SIZE = 100;

  const params = $derived(page.url.searchParams);
  const filter = $derived({
    q: params.get('q') ?? '',
    account_id: params.get('ucet') ?? '',
    category_id: params.get('kategorie') ?? '',
    from: params.get('od') ?? '',
    to: params.get('do') ?? '',
    uncategorized: params.get('nezarazene') === '1',
    auto: params.get('auto') === '1',
  });

  let items = $state<Transaction[]>([]);
  let cursor = $state('');
  let loading = $state(false);
  let error = $state('');
  let selected = $state(-1);
  let openPicker = $state<string | null>(null);
  let searchInput = $state<HTMLInputElement>();
  let query = $state('');

  $effect(() => {
    query = filter.q;
    void load(true);
  });

  $effect(() => {
    if (params.get('focus') === 'search') tick().then(() => searchInput?.focus());
  });

  async function load(reset: boolean) {
    loading = true;
    error = '';
    try {
      const res = await api.get<{ transactions: Transaction[]; next_cursor?: string }>('/transactions', {
        ...filter,
        limit: PAGE_SIZE,
        cursor: reset ? undefined : cursor,
      });
      items = reset ? res.transactions : [...items, ...res.transactions];
      cursor = res.next_cursor ?? '';
      if (reset) selected = -1;
    } catch (e) {
      error = errorText(e);
    } finally {
      loading = false;
    }
  }

  function setParam(key: string, value: string) {
    const url = new URL(page.url);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    url.searchParams.delete('focus');
    goto(url, { keepFocus: true, noScroll: true, replaceState: true });
  }

  let searchTimer: ReturnType<typeof setTimeout>;
  function onSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setParam('q', query.trim()), 250);
  }

  type Day = { day: string; items: { tx: Transaction; index: number }[]; netMinor: number };
  const days = $derived.by(() => {
    const out: Day[] = [];
    items.forEach((tx, index) => {
      let day = out.at(-1);
      if (!day || day.day !== tx.booked_on) {
        day = { day: tx.booked_on, items: [], netMinor: 0 };
        out.push(day);
      }
      day.items.push({ tx, index });
      if (!tx.transfer && tx.amount.currency === 'CZK') day.netMinor += tx.amount.minor;
    });
    return out;
  });

  function dayTitle(day: string) {
    const today = todayISO();
    if (day === today) return t('tx.today');
    if (day === shiftDay(today, -1)) return t('tx.yesterday');
    return dayLabel(day, i18n.intlLocale);
  }

  async function onCategorize(tx: Transaction, categoryId: string, saveRule: boolean) {
    const updated = await categorize(tx, categoryId, saveRule);
    if (!updated) return;
    if (filter.uncategorized) items = items.filter((i) => i.id !== updated.id);
    else items = items.map((i) => (i.id === updated.id ? updated : i));
    if (saveRule) void load(true);
  }

  function replace(updated: Transaction, othersChanged: boolean) {
    if (othersChanged) {
      void load(true);
      return;
    }
    items = items.map((i) => (i.id === updated.id ? updated : i));
  }

  async function onConfirm(tx: Transaction) {
    const updated = await confirmAutomatic(tx);
    if (!updated) return;
    if (filter.auto) items = items.filter((i) => i.id !== updated.id);
    else items = items.map((i) => (i.id === updated.id ? updated : i));
  }

  function onkeydown(e: KeyboardEvent) {
    const el = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || e.metaKey || e.ctrlKey || openPicker) return;
    if (e.key === 'j' || e.key === 'k') {
      e.preventDefault();
      selected = Math.max(0, Math.min(items.length - 1, selected + (e.key === 'j' ? 1 : -1)));
      document.querySelector(`[data-tx="${items[selected]?.id}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'c' && items[selected] && !items[selected].transfer) {
      e.preventDefault();
      openPicker = items[selected].id;
    }
  }
</script>

<svelte:window {onkeydown} />
<svelte:head><title>{t('nav.transactions')} · coin-book</title></svelte:head>

<h1 class="display title">{t('nav.transactions')}</h1>

<div class="filters">
  <label class="search">
    <Icon name="magnifying-glass" size={18} />
    <input
      bind:this={searchInput}
      bind:value={query}
      oninput={onSearch}
      type="search"
      placeholder={t('tx.searchPlaceholder')}
      aria-label={t('tx.searchPlaceholder')}
    />
  </label>
  <select
    value={filter.account_id}
    onchange={(e) => setParam('ucet', e.currentTarget.value)}
    aria-label={t('nav.accounts')}
  >
    <option value="">{t('tx.allAccounts')}</option>
    {#each taxonomy.accounts as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
  </select>
  <select
    value={filter.category_id}
    onchange={(e) => setParam('kategorie', e.currentTarget.value)}
    aria-label={t('nav.categories')}
  >
    <option value="">{t('tx.allCategories')}</option>
    {#each taxonomy.mains as c (c.id)}
      <option value={c.id}>{categoryName(c)}</option>
      {#each taxonomy.children(c.id) as sub (sub.id)}<option value={sub.id}>
          {categoryName(sub)}</option
        >{/each}
    {/each}
  </select>
  <label class="toggle">
    <input
      type="checkbox"
      checked={filter.uncategorized}
      onchange={(e) => setParam('nezarazene', e.currentTarget.checked ? '1' : '')}
    />
    {t('tx.onlyUncategorized')}
  </label>
  <label class="toggle">
    <input
      type="checkbox"
      checked={filter.auto}
      onchange={(e) => setParam('auto', e.currentTarget.checked ? '1' : '')}
    />
    {t('learn.onlyAuto')}
  </label>
</div>

{#if error}
  <p class="error" role="alert">{error}</p>
{:else if !loading && items.length === 0}
  <EmptyState icon="list-bullets" title={t('tx.empty')} />
{:else}
  <div class="list" role="table" aria-label={t('nav.transactions')}>
    {#each days as day (day.day)}
      <div class="day" role="rowgroup">
        <div class="day-head">
          <span>{dayTitle(day.day)}</span>
          {#if day.netMinor !== 0}<MoneyAmount
              amount={{ minor: day.netMinor, currency: 'CZK' }}
              size="sm"
              signed
            />{/if}
        </div>
        {#each day.items as { tx, index } (tx.id)}
          <TransactionRow
            {tx}
            selected={selected === index}
            expanded={selected === index}
            bind:pickerOpen={() => openPicker === tx.id, (open) => (openPicker = open ? tx.id : null)}
            oncategorize={onCategorize}
            onconfirm={onConfirm}
            onselect={() => (selected = selected === index ? -1 : index)}
          >
            {#snippet actions()}
              <OwnTransferAction {tx} ondone={replace} />
            {/snippet}
          </TransactionRow>
        {/each}
      </div>
    {/each}
  </div>
  {#if cursor}
    <div class="more">
      <Button variant="quiet" busy={loading} onclick={() => load(false)}>{t('tx.loadMore')}</Button>
    </div>
  {/if}
{/if}

<style>
  .title {
    margin: 0 0 20px;
    font-size: var(--text-headline);
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-bottom: 18px;
  }
  .search {
    flex: 1 1 260px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-radius: var(--radius-input);
    background: var(--surface);
    border: 1.5px solid var(--line);
    color: var(--ink-faint);
  }
  .search:focus-within {
    border-color: var(--brand);
  }
  .search input {
    flex: 1;
    padding: 10px 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    outline: none;
  }
  select {
    padding: 9px 10px;
    border-radius: var(--radius-input);
    border: 1.5px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    max-width: 220px;
  }
  .toggle {
    display: flex;
    gap: 8px;
    align-items: center;
    font-weight: 600;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .list {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 6px 8px 10px;
  }
  .day-head {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    padding: 12px 14px 6px;
    background: var(--surface);
    font-size: var(--text-micro);
    font-weight: 700;
    color: var(--ink-soft);
  }
  .day-head span:first-letter {
    text-transform: uppercase;
  }
  .more {
    display: flex;
    justify-content: center;
    margin-top: 18px;
  }
  .error {
    color: var(--over);
    font-weight: 600;
  }
</style>
