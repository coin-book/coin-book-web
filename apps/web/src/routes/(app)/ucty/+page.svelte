<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '@coin-book/core/api';
  import { shortDate } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { t } from '@coin-book/core/i18n';
  import { parseMinor } from '@coin-book/core/money';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import { toasts } from '@coin-book/core/toast';
  import type { Account } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import EmptyState from '@coin-book/ui/EmptyState.svelte';
  import Icon from '@coin-book/ui/Icon.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';

  let editing = $state<string | null>(null);
  let name = $state('');
  let opening = $state('');

  onMount(() => void taxonomy.reloadAccounts());

  const totals = $derived.by(() => {
    const byCurrency = new Map<string, number>();
    for (const a of taxonomy.accounts) {
      if (!a.archived) byCurrency.set(a.currency, (byCurrency.get(a.currency) ?? 0) + a.balance.minor);
    }
    return [...byCurrency].map(([currency, minor]) => ({ currency, minor }));
  });

  function edit(a: Account) {
    editing = a.id;
    name = a.name;
    opening = (a.opening_balance.minor / 100).toString().replace('.', ',');
  }

  async function save(a: Account) {
    const openingMinor = parseMinor(opening, a.currency);
    if (openingMinor === null) {
      toasts.show(t('accounts.openingHint'), 'error');
      return;
    }
    try {
      await api.patch(`/accounts/${a.id}`, { name: name.trim(), opening_balance_minor: openingMinor });
      await taxonomy.reloadAccounts();
      editing = null;
      toasts.show(t('accounts.saved'), 'success');
    } catch (e) {
      toasts.show(errorText(e), 'error');
    }
  }
</script>

<svelte:head><title>{t('accounts.title')} · coin-book</title></svelte:head>

<h1 class="display title">{t('accounts.title')}</h1>

{#if taxonomy.accounts.length === 0}
  <EmptyState icon="bank" title={t('accounts.empty')}>
    <Button href="/importy" icon="upload-simple">{t('overview.toImport')}</Button>
  </EmptyState>
{:else}
  <section class="totals">
    <span class="label">{t('accounts.netWorth')}</span>
    <div class="amounts">
      {#each totals as total (total.currency)}
        <MoneyAmount amount={total} size="lg" />
      {/each}
    </div>
  </section>

  <ul class="accounts">
    {#each taxonomy.accounts as a (a.id)}
      <li class="panel">
        <span class="inst inst-{a.institution}" aria-hidden="true"
          ><Icon name="bank" size={22} weight="duotone" /></span
        >
        {#if editing === a.id}
          <form
            class="edit"
            onsubmit={(e) => {
              e.preventDefault();
              void save(a);
            }}
          >
            <label>
              <span>{t('accounts.rename')}</span>
              <input bind:value={name} required maxlength="100" />
            </label>
            <label>
              <span>{t('accounts.opening')} ({a.currency})</span>
              <input bind:value={opening} inputmode="decimal" />
              <small>{t('accounts.openingHint')}</small>
            </label>
            <div class="edit-actions">
              <Button variant="ghost" type="button" onclick={() => (editing = null)}
                >{t('common.cancel')}</Button
              >
              <Button type="submit">{t('accounts.save')}</Button>
            </div>
          </form>
        {:else}
          <div class="info">
            <strong>{a.name}</strong>
            <span class="meta">
              {#if a.account_number}<span class="num">{a.account_number}</span>{/if}
              {#if a.last_booked_on}
                <span
                  >{t('accounts.transactions', {
                    count: a.transaction_count,
                    date: shortDate(a.last_booked_on),
                  })}</span
                >
              {/if}
            </span>
          </div>
          <MoneyAmount amount={a.balance} size="lg" />
          <Button variant="ghost" onclick={() => edit(a)}>{t('accounts.rename')}</Button>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .title {
    margin: 0 0 20px;
    font-size: var(--text-headline);
  }
  .totals {
    margin-bottom: 20px;
  }
  .label {
    display: block;
    font-size: var(--text-micro);
    color: var(--ink-faint);
    margin-bottom: 4px;
  }
  .amounts {
    display: flex;
    flex-wrap: wrap;
    gap: 28px;
  }
  .accounts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .panel {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    border-radius: var(--radius-panel);
    background: var(--surface);
  }
  .inst {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: color-mix(in oklch, var(--brand) 12%, transparent);
    color: var(--brand);
  }
  .inst-mbank_cz,
  .inst-mbank_sk {
    background: color-mix(in oklch, var(--cat-malina) 16%, transparent);
    color: var(--cat-malina);
  }
  .inst-revolut {
    background: color-mix(in oklch, var(--cat-chrpa) 16%, transparent);
    color: var(--cat-chrpa);
  }
  .info {
    min-width: 0;
  }
  .info strong {
    display: block;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .edit {
    grid-column: 2 / -1;
    display: grid;
    gap: 12px;
  }
  .edit label {
    display: grid;
    gap: 4px;
    font-size: var(--text-micro);
    font-weight: 600;
  }
  .edit input {
    padding: 9px 11px;
    border-radius: var(--radius-input);
    border: 1.5px solid var(--line);
    background: var(--canvas);
    color: var(--ink);
    font: inherit;
    max-width: 360px;
  }
  .edit small {
    font-weight: 400;
    color: var(--ink-faint);
  }
  .edit-actions {
    display: flex;
    gap: 10px;
  }
  @media (max-width: 640px) {
    .panel {
      grid-template-columns: auto minmax(0, 1fr);
    }
  }
</style>
