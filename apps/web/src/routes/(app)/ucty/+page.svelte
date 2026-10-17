<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '@coin-book/core/api';
  import { shortDate } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { t } from '@coin-book/core/i18n';
  import { parseMinor } from '@coin-book/core/money';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import { toasts } from '@coin-book/core/toast';
  import type { Account, AccountAlias, OwnAccountCandidate } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import EmptyState from '@coin-book/ui/EmptyState.svelte';
  import Icon from '@coin-book/ui/Icon.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import BankSelect from '$lib/BankSelect.svelte';
  import { queue } from '$lib/queue.svelte';

  const kinds = ['current', 'savings', 'pocket', 'fund', 'broker', 'cash', 'card'] as const;
  type Kind = (typeof kinds)[number];
  const currencies = ['CZK', 'EUR', 'USD', 'PLN', 'GBP'];
  const kindIcon: Record<string, string> = { cash: 'piggy-bank', card: 'receipt', fund: 'piggy-bank' };

  let editing = $state<string | null>(null);
  let merging = $state<string | null>(null);
  let creating = $state(false);
  let aliases = $state<AccountAlias[]>([]);
  let candidates = $state<OwnAccountCandidate[]>([]);
  let dismissed = $state<string[]>(loadDismissed());

  let name = $state('');
  let kind = $state<Kind>('current');
  let opening = $state('');
  let mergeTarget = $state('');
  let bankId = $state('');

  let newName = $state('');
  let newKind = $state<Kind>('cash');
  let newCurrency = $state('CZK');
  let newNumber = $state('');
  let newOpening = $state('');
  let newBank = $state('');

  onMount(() => {
    void taxonomy.reloadAccounts();
    void loadAliases();
    void loadCandidates();
  });

  const DISMISSED_KEY = 'coinbook.notMyAccounts';

  function loadDismissed(): string[] {
    try {
      return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  function dismiss(c: OwnAccountCandidate) {
    dismissed = [...dismissed, c.account_number];
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    } catch {
      // Not remembered; it shows again next time.
    }
  }

  const visibleCandidates = $derived(candidates.filter((c) => !dismissed.includes(c.account_number)));

  async function loadCandidates() {
    candidates = (await api.get<{ candidates: OwnAccountCandidate[] }>('/transfers/own-account-candidates'))
      .candidates;
  }

  function adopt(c: OwnAccountCandidate) {
    creating = true;
    newName = c.counterparty || taxonomy.bankName(c.bank_id) || c.account_number;
    newKind = 'savings';
    newCurrency = c.currency;
    newNumber = c.account_number;
    newBank = c.bank_id ?? '';
    newOpening = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function loadAliases() {
    aliases = (await api.get<{ aliases: AccountAlias[] }>('/account-aliases')).aliases;
  }

  const totals = $derived.by(() => {
    const byCurrency = new Map<string, number>();
    for (const a of taxonomy.accounts) {
      if (!a.archived) byCurrency.set(a.currency, (byCurrency.get(a.currency) ?? 0) + a.balance.minor);
    }
    return [...byCurrency].map(([currency, minor]) => ({ currency, minor }));
  });

  function decimal(minor: number) {
    return (minor / 100).toString().replace('.', ',');
  }

  function edit(a: Account) {
    merging = null;
    editing = a.id;
    name = a.name;
    kind = a.kind as Kind;
    bankId = a.bank_id ?? '';
    opening = decimal(a.opening_balance.minor);
  }

  function startMerge(a: Account) {
    editing = null;
    merging = a.id;
    mergeTarget = mergeCandidates(a)[0]?.id ?? '';
  }

  function mergeCandidates(a: Account) {
    return taxonomy.accounts.filter((o) => o.id !== a.id && o.currency === a.currency);
  }

  async function save(a: Account) {
    const openingMinor = parseMinor(opening || '0', a.currency);
    if (openingMinor === null) {
      toasts.show(t('accounts.openingHint'), 'error');
      return;
    }
    try {
      await api.patch(`/accounts/${a.id}`, {
        name: name.trim(),
        kind,
        opening_balance_minor: openingMinor,
        bank_id: bankId,
      });
      await taxonomy.reloadAccounts();
      editing = null;
      toasts.show(t('accounts.saved'), 'success');
    } catch (e) {
      toasts.show(errorText(e), 'error');
    }
  }

  async function create(e: SubmitEvent) {
    e.preventDefault();
    const openingMinor = parseMinor(newOpening || '0', newCurrency);
    if (openingMinor === null) {
      toasts.show(t('accounts.openingHint'), 'error');
      return;
    }
    try {
      await api.post('/accounts', {
        name: newName.trim(),
        kind: newKind,
        currency: newCurrency,
        account_number: newNumber.trim() || undefined,
        bank_id: newBank || undefined,
        opening_balance_minor: openingMinor,
      });
      await Promise.all([taxonomy.reloadAccounts(), loadCandidates(), queue.refresh()]);
      creating = false;
      newName = newNumber = newOpening = newBank = '';
      toasts.show(t('accounts.created'), 'success');
    } catch (err) {
      toasts.show(errorText(err), 'error');
    }
  }

  async function merge(source: Account) {
    const target = taxonomy.accountsById.get(mergeTarget);
    if (!target) return;
    if (!confirm(t('accounts.mergeConfirm', { source: source.name, target: target.name }))) return;
    try {
      const res = await api.post<{ moved: number }>(`/accounts/${source.id}/merge`, { target_id: target.id });
      await Promise.all([taxonomy.reloadAccounts(), loadAliases(), queue.refresh()]);
      merging = null;
      toasts.show(t('accounts.merged', { count: res.moved }), 'success');
    } catch (e) {
      toasts.show(errorText(e), 'error');
    }
  }

  async function forget(alias: AccountAlias) {
    try {
      await api.delete(`/account-aliases/${alias.id}`);
      aliases = aliases.filter((a) => a.id !== alias.id);
      toasts.show(t('accounts.aliasForgotten'), 'success');
    } catch (e) {
      toasts.show(errorText(e), 'error');
    }
  }
</script>

<svelte:head><title>{t('accounts.title')} · coin-book</title></svelte:head>

<header class="head">
  <h1 class="display title">{t('accounts.title')}</h1>
  {#if !creating}
    <Button icon="plus" onclick={() => (creating = true)}>{t('accounts.new')}</Button>
  {/if}
</header>

{#if creating}
  <form class="panel create" onsubmit={create} data-testid="account-form">
    <label class="field grow">
      <span>{t('accounts.name')}</span>
      <input bind:value={newName} required maxlength="100" />
    </label>
    <label class="field">
      <span>{t('accounts.kind')}</span>
      <select bind:value={newKind}>
        {#each kinds as k (k)}<option value={k}>{t(`accounts.kind.${k}`)}</option>{/each}
      </select>
    </label>
    <label class="field">
      <span>{t('accounts.currency')}</span>
      <select bind:value={newCurrency}>
        {#each currencies as c (c)}<option value={c}>{c}</option>{/each}
      </select>
    </label>
    <label class="field grow">
      <span>{t('accounts.number')}</span>
      <input bind:value={newNumber} maxlength="50" />
      <small>{t('accounts.numberHint')}</small>
    </label>
    <label class="field">
      <span>{t('bank.label')}</span>
      <BankSelect value={newBank} onchange={(v) => (newBank = v)} emptyLabel={t('bank.detect')} />
    </label>
    <label class="field">
      <span>{t('accounts.opening')}</span>
      <input bind:value={newOpening} inputmode="decimal" placeholder="0" />
    </label>
    <div class="actions">
      <Button variant="ghost" type="button" onclick={() => (creating = false)}>{t('common.cancel')}</Button>
      <Button type="submit">{t('accounts.create')}</Button>
    </div>
  </form>
{/if}

{#if visibleCandidates.length > 0 && !creating}
  <section class="panel candidates" data-testid="own-account-candidates">
    <h2>{t('ownAccounts.title')}</h2>
    <p class="hint">{t('ownAccounts.lead')}</p>
    <ul>
      {#each visibleCandidates as c (c.account_number)}
        <li>
          <div class="info">
            <strong>{c.counterparty || taxonomy.bankName(c.bank_id) || c.account_number}</strong>
            <span class="meta">
              {#if c.bank_id}<span class="bank">{taxonomy.bankName(c.bank_id)}</span>{/if}
              <span class="num">{c.account_number}</span>
              <span
                >{t('ownAccounts.stats', { count: c.transactions, date: shortDate(c.last_booked_on) })}</span
              >
              {#if c.out_minor > 0}<span
                  >{t('ownAccounts.sent')}
                  <MoneyAmount amount={{ minor: c.out_minor, currency: c.currency }} whole /></span
                >{/if}
            </span>
          </div>
          <div class="row-actions">
            <Button variant="ghost" onclick={() => dismiss(c)}>{t('ownAccounts.notMine')}</Button>
            <Button variant="quiet" icon="plus" onclick={() => adopt(c)}>{t('ownAccounts.add')}</Button>
          </div>
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#if taxonomy.accounts.length === 0 && !creating}
  <EmptyState icon="bank" title={t('accounts.empty')}>
    <Button href="/importy" icon="upload-simple">{t('overview.toImport')}</Button>
  </EmptyState>
{:else if taxonomy.accounts.length > 0}
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
      <li class="panel" data-testid="account-card">
        <span class="inst inst-{a.institution} kind-{a.kind}" aria-hidden="true">
          <Icon name={kindIcon[a.kind] ?? 'bank'} size={22} weight="duotone" />
        </span>
        <div class="info">
          <strong>{a.name}</strong>
          <span class="meta">
            {#if a.bank_id}<span class="bank">{taxonomy.bankName(a.bank_id)}</span>{/if}
            <span>{t(`accounts.kind.${a.kind as Kind}`)}</span>
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
        <div class="row-actions">
          <Button variant="ghost" onclick={() => edit(a)}>{t('accounts.rename')}</Button>
          <Button variant="ghost" icon="git-merge" onclick={() => startMerge(a)}>{t('accounts.merge')}</Button
          >
        </div>

        {#if editing === a.id}
          <form
            class="drawer"
            onsubmit={(e) => {
              e.preventDefault();
              void save(a);
            }}
          >
            <label class="field grow">
              <span>{t('accounts.name')}</span>
              <input bind:value={name} required maxlength="100" />
            </label>
            <label class="field">
              <span>{t('accounts.kind')}</span>
              <select bind:value={kind}>
                {#each kinds as k (k)}<option value={k}>{t(`accounts.kind.${k}`)}</option>{/each}
              </select>
            </label>
            <label class="field">
              <span>{t('bank.label')}</span>
              <BankSelect value={bankId} onchange={(v) => (bankId = v)} />
            </label>
            <label class="field">
              <span>{t('accounts.opening')} ({a.currency})</span>
              <input bind:value={opening} inputmode="decimal" />
            </label>
            <small class="hint">{t('accounts.openingHint')}</small>
            <div class="actions">
              <Button variant="ghost" type="button" onclick={() => (editing = null)}
                >{t('common.cancel')}</Button
              >
              <Button type="submit">{t('accounts.save')}</Button>
            </div>
          </form>
        {/if}

        {#if merging === a.id}
          <div class="drawer">
            {#if mergeCandidates(a).length === 0}
              <p class="hint">{t('accounts.mergeNone')}</p>
              <div class="actions">
                <Button variant="ghost" onclick={() => (merging = null)}>{t('common.close')}</Button>
              </div>
            {:else}
              <label class="field grow">
                <span>{t('accounts.mergeTarget')}</span>
                <select bind:value={mergeTarget}>
                  {#each mergeCandidates(a) as o (o.id)}<option value={o.id}>{o.name}</option>{/each}
                </select>
              </label>
              <div class="actions">
                <Button variant="ghost" onclick={() => (merging = null)}>{t('common.cancel')}</Button>
                <Button variant="danger" icon="git-merge" onclick={() => merge(a)}
                  >{t('accounts.mergeTarget')}</Button
                >
              </div>
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ul>

  {#if aliases.length > 0}
    <section class="panel aliases">
      <h2>{t('accounts.aliases')}</h2>
      <p class="hint">{t('accounts.aliasesLead')}</p>
      <ul>
        {#each aliases as alias (alias.id)}
          <li>
            <span class="num">{alias.identity}</span>
            <Icon name="caret-right" size={14} weight="bold" />
            <strong>{taxonomy.accountsById.get(alias.account_id)?.name ?? ''}</strong>
            <Button variant="ghost" onclick={() => forget(alias)}>{t('accounts.aliasForget')}</Button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
{/if}

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
  }
  .title {
    margin: 0;
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
    margin: 0 0 18px;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .panel {
    border-radius: var(--radius-panel);
    background: var(--surface);
    padding: 16px 20px;
  }
  .accounts .panel {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 16px;
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
  .kind-cash {
    background: color-mix(in oklch, var(--cat-slunecnice) 18%, transparent);
    color: var(--cat-slunecnice);
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
  .bank {
    font-weight: 700;
    color: var(--ink-soft);
  }
  .row-actions {
    display: flex;
    gap: 4px;
  }
  .drawer,
  .create {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 12px 14px;
  }
  .drawer {
    grid-column: 2 / -1;
    padding-top: 12px;
    border-top: 1px solid var(--line);
  }
  .create {
    margin-bottom: 18px;
  }
  .field {
    display: grid;
    gap: 4px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-soft);
  }
  .field.grow {
    flex: 1 1 220px;
  }
  .field input,
  .field select {
    padding: 9px 11px;
    border-radius: var(--radius-input);
    border: 1.5px solid var(--line);
    background: var(--canvas);
    color: var(--ink);
    font: inherit;
    font-size: var(--text-body);
    font-weight: 500;
  }
  .field input:focus,
  .field select:focus {
    border-color: var(--brand);
    outline: none;
  }
  .field small,
  .hint {
    font-weight: 400;
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .drawer .hint {
    flex-basis: 100%;
    margin: 0;
  }
  .actions {
    display: flex;
    gap: 10px;
    margin-left: auto;
    align-self: flex-end;
  }
  .candidates {
    margin-bottom: 18px;
    border: 1.5px dashed color-mix(in oklch, var(--transfer) 60%, transparent);
  }
  .candidates h2 {
    margin: 0 0 4px;
    font-size: var(--text-body);
  }
  .candidates ul {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
  }
  .candidates li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px 16px;
    padding: 10px 0;
    border-top: 1px solid var(--line);
  }
  .aliases h2 {
    margin: 0 0 4px;
    font-size: var(--text-body);
  }
  .aliases ul {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
  }
  .aliases li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    border-top: 1px solid var(--line);
  }
  .aliases li :global(.btn) {
    margin-left: auto;
  }
  @media (max-width: 760px) {
    .accounts .panel {
      grid-template-columns: auto minmax(0, 1fr);
    }
    .row-actions,
    .drawer {
      grid-column: 1 / -1;
    }
  }
</style>
