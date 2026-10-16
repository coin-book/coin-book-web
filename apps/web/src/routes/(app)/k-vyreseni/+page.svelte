<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '@coin-book/core/api';
  import { colorVar } from '@coin-book/core/colors';
  import { shortDate } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { t } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import { toasts } from '@coin-book/core/toast';
  import type { AmbiguousTransfer, Transaction, Triage } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import CategoryIcon from '@coin-book/ui/CategoryIcon.svelte';
  import CategoryPicker from '@coin-book/ui/CategoryPicker.svelte';
  import EmptyState from '@coin-book/ui/EmptyState.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import TransactionRow from '@coin-book/ui/TransactionRow.svelte';
  import { categorize } from '$lib/categorize';
  import { queue } from '$lib/queue.svelte';

  const QUICK_PICKS = 9;
  const LEAVE_MS = 320;

  let triage = $state<Triage | null>(null);
  let skipped = $state<string[]>([]);
  let saveRule = $state(true);
  let leaving = $state<string | null>(null);
  let pickerOpen = $state(false);
  let busy = $state(false);
  let error = $state('');

  let ambiguous = $state<AmbiguousTransfer[]>([]);
  let ambiguousTx = $state<Record<string, Transaction>>({});

  const tx = $derived(triage?.transaction ?? null);
  const suggestion = $derived(triage?.suggested[0]?.category_id ?? null);
  const quickPicks = $derived.by(() => {
    const ids = [...(triage?.suggested ?? []), ...(triage?.quick_picks ?? [])].map((s) => s.category_id);
    for (const main of taxonomy.mains) if (main.kind === 'expense') ids.push(main.id);
    return [...new Set(ids)].slice(0, QUICK_PICKS);
  });

  onMount(() => {
    void next();
    void loadAmbiguous();
  });

  async function next() {
    try {
      triage = await api.get<Triage>('/triage', { skip: skipped.length ? skipped.join(',') : undefined });
      queue.remaining = triage.remaining;
      saveRule = !!triage.transaction?.counterparty;
    } catch (e) {
      error = errorText(e);
    }
  }

  async function assign(categoryId: string, withRule = saveRule) {
    if (!tx || busy) return;
    busy = true;
    const done = await categorize(tx, categoryId, withRule && !!tx.counterparty);
    if (done) {
      leaving = taxonomy.colorKey(categoryId);
      await new Promise((r) => setTimeout(r, LEAVE_MS));
      leaving = null;
      await next();
    }
    busy = false;
  }

  function skip() {
    if (!tx) return;
    skipped = [...skipped, tx.id];
    void next();
  }

  function onkeydown(e: KeyboardEvent) {
    if (!tx || pickerOpen || e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const digit = Number(e.key);
    if (digit >= 1 && digit <= quickPicks.length) {
      e.preventDefault();
      void assign(quickPicks[digit - 1]);
    } else if (e.key === 'Enter' && suggestion) {
      e.preventDefault();
      void assign(suggestion);
    } else if (e.key.toLowerCase() === 's') {
      e.preventDefault();
      skip();
    }
  }

  async function loadAmbiguous() {
    try {
      ambiguous = (await api.get<{ ambiguous: AmbiguousTransfer[] }>('/transfers/ambiguous')).ambiguous;
      const ids = [...new Set(ambiguous.flatMap((a) => [a.transaction_id, ...a.candidate_ids]))];
      const loaded = await Promise.all(ids.map((id) => api.get<Transaction>(`/transactions/${id}`)));
      ambiguousTx = Object.fromEntries(loaded.map((t) => [t.id, t]));
    } catch {
      ambiguous = [];
    }
  }

  async function pair(outId: string, inId: string) {
    try {
      await api.post('/transfers', { out_tx_id: outId, in_tx_id: inId });
      await loadAmbiguous();
      void queue.refresh();
    } catch (e) {
      toasts.show(errorText(e), 'error');
    }
  }
</script>

<svelte:window {onkeydown} />
<svelte:head><title>{t('nav.triage')} · coin-book</title></svelte:head>

<h1 class="display title">{t('nav.triage')}</h1>

{#if error}
  <p class="error" role="alert">{error}</p>
{:else if triage && !tx}
  <EmptyState icon="check-circle" title={t('triage.doneTitle')} lead={t('triage.doneLead')} />
{:else if tx}
  <section class="stage">
    <p class="remaining num">{t('triage.remaining', { count: triage?.remaining ?? 0 })}</p>
    {#key tx.id}
      <article
        class="card"
        class:leaving={leaving !== null}
        style="--leave: {leaving ? colorVar(leaving) : 'transparent'}"
      >
        <MoneyAmount amount={tx.amount} size="hero" signed />
        <h2 class="who">{tx.counterparty || tx.description}</h2>
        <p class="where">
          <span>{shortDate(tx.booked_on)}</span>
          <span class="account">{taxonomy.accountsById.get(tx.account_id)?.name ?? ''}</span>
          {#if tx.counterparty && tx.description !== tx.counterparty}<br /><span class="desc"
              >{tx.description}</span
            >{/if}
        </p>

        {#if suggestion}
          <button type="button" class="suggestion" onclick={() => assign(suggestion)}>
            <span class="hint">{t('triage.suggestion')}</span>
            <CategoryIcon
              colorKey={taxonomy.colorKey(suggestion)}
              icon={taxonomy.icon(suggestion)}
              size={28}
            />
            <strong>{taxonomy.label(suggestion)}</strong>
            <kbd>⏎</kbd>
          </button>
        {/if}

        <ol class="picks">
          {#each quickPicks as id, i (id)}
            <li>
              <button
                type="button"
                style="--c: {colorVar(taxonomy.colorKey(id))}"
                onclick={() => assign(id)}
                disabled={busy}
              >
                <kbd>{i + 1}</kbd>
                <span>{taxonomy.label(id)}</span>
              </button>
            </li>
          {/each}
          <li>
            <CategoryPicker bind:open={pickerOpen} onpick={(id) => assign(id)}>
              {#snippet trigger(props)}
                <button {...props} type="button" class="other">{t('picker.placeholder')}</button>
              {/snippet}
            </CategoryPicker>
          </li>
        </ol>

        {#if tx.counterparty}
          <label class="rule">
            <input type="checkbox" bind:checked={saveRule} />
            {t('picker.saveRule', { value: tx.counterparty })}
          </label>
        {/if}

        <div class="actions">
          <Button variant="ghost" onclick={skip}>{t('triage.skip')} <kbd>S</kbd></Button>
        </div>
      </article>
    {/key}
    <p class="keys">{t('triage.keys')}</p>
  </section>
{/if}

{#if ambiguous.length > 0}
  <section class="panel">
    <h2 class="display">{t('triage.transfersTitle')}</h2>
    <p class="lead">{t('triage.transfersLead')}</p>
    {#each ambiguous as a (a.transaction_id)}
      {#if ambiguousTx[a.transaction_id]}
        <div class="ambiguous">
          <TransactionRow tx={ambiguousTx[a.transaction_id]} />
          <ul>
            {#each a.candidate_ids as id (id)}
              {#if ambiguousTx[id]}
                <li>
                  <TransactionRow tx={ambiguousTx[id]} />
                  <Button variant="quiet" icon="arrows-left-right" onclick={() => pair(a.transaction_id, id)}>
                    {t('triage.pair')}
                  </Button>
                </li>
              {/if}
            {/each}
          </ul>
        </div>
      {/if}
    {/each}
  </section>
{/if}

<style>
  .title {
    margin: 0 0 20px;
    font-size: var(--text-headline);
  }
  .stage {
    display: grid;
    justify-items: center;
    margin-bottom: 40px;
  }
  .remaining {
    margin: 0 0 14px;
    font-weight: 700;
    color: var(--ink-soft);
  }
  .card {
    width: min(620px, 100%);
    box-sizing: border-box;
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: 34px clamp(18px, 4vw, 40px) 26px;
    border-radius: 24px;
    background: var(--surface);
    box-shadow: var(--shadow-float);
    text-align: center;
    animation: arrive 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .card.leaving {
    transform: translateX(120%) rotate(6deg);
    opacity: 0;
    box-shadow: inset 0 0 0 999px color-mix(in oklch, var(--leave) 30%, transparent);
    transition:
      transform 320ms cubic-bezier(0.5, 0, 0.75, 0),
      opacity 320ms ease,
      box-shadow 120ms ease;
  }
  @keyframes arrive {
    from {
      transform: translateY(14px) scale(0.98);
      opacity: 0;
    }
  }
  .who {
    margin: 14px 0 0;
    font-size: var(--text-title);
    font-weight: 750;
  }
  .where {
    margin: 0 0 14px;
    color: var(--ink-soft);
  }
  .account {
    margin-left: 12px;
    color: var(--ink-faint);
  }
  .desc {
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .suggestion {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px 8px 10px;
    margin-bottom: 14px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in oklch, var(--brand) 9%, transparent);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }
  .hint {
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .picks {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .picks button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px 7px 7px;
    border-radius: 999px;
    border: 0;
    background: color-mix(in oklch, var(--c) 16%, transparent);
    color: var(--ink);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .picks button:hover:not(:disabled) {
    background: color-mix(in oklch, var(--c) 30%, transparent);
  }
  .picks kbd {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: var(--c);
    color: var(--on-dark);
    font: inherit;
    font-size: 12px;
    font-weight: 800;
  }
  .picks .other {
    padding: 7px 14px;
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--line);
    color: var(--ink-soft);
  }
  kbd {
    font: inherit;
    font-size: 12px;
    color: var(--ink-faint);
  }
  .rule {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    font-size: var(--text-micro);
    color: var(--ink-soft);
    cursor: pointer;
  }
  .rule input {
    accent-color: var(--brand);
  }
  .actions {
    margin-top: 10px;
  }
  .keys {
    margin: 14px 0 0;
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .panel {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 22px 24px;
  }
  .panel h2 {
    margin: 0;
    font-size: var(--text-title);
  }
  .lead {
    margin: 4px 0 16px;
    color: var(--ink-soft);
  }
  .ambiguous {
    border-top: 1px solid var(--line);
    padding: 10px 0;
  }
  .ambiguous ul {
    list-style: none;
    margin: 0 0 0 48px;
    padding: 0;
  }
  .ambiguous li {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ambiguous li > :global(:first-child) {
    flex: 1;
  }
  .error {
    color: var(--over);
    font-weight: 600;
  }
</style>
