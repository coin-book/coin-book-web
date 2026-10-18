<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '@coin-book/core/api';
  import { colorVar } from '@coin-book/core/colors';
  import { shortDate } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { usable } from '@coin-book/core/learning';
  import { t } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import { toasts } from '@coin-book/core/toast';
  import type { AmbiguousTransfer, Transaction, Triage } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import CategoryIcon from '@coin-book/ui/CategoryIcon.svelte';
  import CategoryPicker from '@coin-book/ui/CategoryPicker.svelte';
  import EmptyState from '@coin-book/ui/EmptyState.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import TransactionDetails from '@coin-book/ui/TransactionDetails.svelte';
  import TransactionRow from '@coin-book/ui/TransactionRow.svelte';
  import { categorize } from '$lib/categorize';
  import OwnTransferAction from '$lib/OwnTransferAction.svelte';
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

  /** The whole queue, newest first, for the list beside the card. */
  let items = $state<Transaction[]>([]);
  /** How many were waiting when the page opened, for the progress bar. */
  let startedWith = $state(0);

  let ambiguous = $state<AmbiguousTransfer[]>([]);
  let ambiguousTx = $state<Record<string, Transaction>>({});

  const tx = $derived(triage?.transaction ?? null);
  const suggested = $derived(usable(triage?.suggested));
  const top = $derived(suggested[0] ?? null);
  const suggestion = $derived(top?.category_id ?? null);
  const confidenceOf = $derived(new Map(suggested.map((s) => [s.category_id, s.confidence])));
  let autoCount = $state(0);
  const quickPicks = $derived.by(() => {
    const ids = [...suggested, ...(triage?.quick_picks ?? [])].map((s) => s.category_id);
    for (const main of taxonomy.mains) if (main.kind === 'expense') ids.push(main.id);
    return [...new Set(ids)].slice(0, QUICK_PICKS);
  });

  type QueueGroup = { key: string; label: string; ids: string[]; amount: Transaction['amount'] | null };

  /** Transactions of one counterparty together, in the order the newest of each arrived. */
  const groups = $derived.by<QueueGroup[]>(() => {
    const byKey = new Map<string, QueueGroup>();
    for (const item of items) {
      const label = item.counterparty || item.description;
      const key = label.trim().toUpperCase();
      let g = byKey.get(key);
      if (!g) {
        g = { key, label, ids: [], amount: { minor: 0, currency: item.amount.currency } };
        byKey.set(key, g);
      }
      g.ids.push(item.id);
      if (g.amount && g.amount.currency === item.amount.currency) g.amount.minor += item.amount.minor;
      else g.amount = null;
    }
    return [...byKey.values()];
  });
  const currentGroup = $derived(tx ? groups.find((g) => g.ids.includes(tx.id)) : undefined);

  let queueList = $state<HTMLUListElement>();
  $effect(() => {
    if (!queueList || !currentGroup) return;
    const active = queueList.querySelector<HTMLElement>('[aria-current="true"]');
    if (active) revealInQueue(queueList, active);
  });

  /** Scrolls only the queue, never the page, so the card stays where the eye is. */
  function revealInQueue(list: HTMLElement, item: HTMLElement) {
    const outer = list.getBoundingClientRect();
    const inner = item.getBoundingClientRect();
    if (inner.left < outer.left || inner.right > outer.right) list.scrollLeft += inner.left - outer.left;
    if (inner.top < outer.top || inner.bottom > outer.bottom) list.scrollTop += inner.top - outer.top;
  }
  const remaining = $derived(triage?.remaining ?? 0);
  const done = $derived(Math.max(0, startedWith - remaining));

  onMount(() => {
    void loadQueue().then(() => (startedWith = Math.max(startedWith, items.length)));
    void next();
    void loadAmbiguous();
    void loadAuto();
  });

  async function loadAuto() {
    try {
      autoCount = (
        await api.get<{ transactions: Transaction[] }>('/transactions', { auto: true, limit: 200 })
      ).transactions.length;
    } catch {
      autoCount = 0;
    }
  }

  async function confirmAll() {
    try {
      const res = await api.post<{ confirmed: number }>('/transactions/confirm-automatic');
      toasts.show(t('learn.confirmedAll', { count: res.confirmed }), 'success');
      autoCount = 0;
    } catch (e) {
      toasts.show(errorText(e), 'error');
    }
  }

  async function loadQueue() {
    try {
      items = (
        await api.get<{ transactions: Transaction[] }>('/transactions', { uncategorized: true, limit: 200 })
      ).transactions;
    } catch {
      items = [];
    }
  }

  /** The transaction after the current one in the list, wrapping round, leaving out skipped ones. */
  function following(currentId: string) {
    const order = groups.flatMap((g) => g.ids).filter((id) => id === currentId || !skipped.includes(id));
    const i = order.indexOf(currentId);
    return order.length > 1 && i >= 0 ? order[(i + 1) % order.length] : undefined;
  }

  async function next(focus?: string) {
    try {
      triage = await api.get<Triage>('/triage', {
        skip: skipped.length ? skipped.join(',') : undefined,
        id: focus,
      });
      queue.remaining = triage.remaining;
      startedWith = Math.max(startedWith, triage.remaining);
      saveRule = !!triage.transaction?.counterparty;
    } catch (e) {
      error = errorText(e);
    }
  }

  async function assign(categoryId: string, withRule = saveRule) {
    if (!tx || busy) return;
    busy = true;
    const after = following(tx.id);
    const categorized = await categorize(tx, categoryId, withRule && !!tx.counterparty);
    if (categorized) {
      leaving = taxonomy.colorKey(categoryId);
      await new Promise((r) => setTimeout(r, LEAVE_MS));
      leaving = null;
      await loadQueue();
      await next(after && items.some((i) => i.id === after) ? after : undefined);
    }
    busy = false;
  }

  function skip() {
    if (!tx) return;
    const after = following(tx.id);
    skipped = [...skipped, tx.id];
    void next(after);
  }

  function pick(id: string) {
    if (busy || id === tx?.id) return;
    void next(id);
  }

  function onkeydown(e: KeyboardEvent) {
    if (!tx || pickerOpen || e.metaKey || e.ctrlKey || e.altKey) return;
    if (['INPUT', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
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

{#snippet followUps()}
  {#if autoCount > 0}
    <section class="panel auto">
      <div>
        <h2 class="display">{t('learn.autoTitle')}</h2>
        <p class="lead">{t('learn.autoLead', { count: autoCount })}</p>
      </div>
      <div class="auto-actions">
        <Button variant="quiet" href="/transactions?auto=1">{t('learn.review')}</Button>
        <Button icon="check" onclick={confirmAll}>{t('learn.confirmAll')}</Button>
      </div>
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
                    <Button
                      variant="quiet"
                      icon="arrows-left-right"
                      onclick={() => pair(a.transaction_id, id)}
                    >
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
{/snippet}

<svelte:window {onkeydown} />
<svelte:head><title>{t('nav.triage')} · coin-book</title></svelte:head>

<h1 class="display title">{t('nav.triage')}</h1>

{#if error}
  <p class="error" role="alert">{error}</p>
{:else if triage && !tx}
  <EmptyState icon="check-circle" title={t('triage.doneTitle')} lead={t('triage.doneLead')} />
  {@render followUps()}
{:else if tx}
  <div class="split">
    <nav class="queue" aria-label={t('triage.queue')} data-testid="triage-queue">
      <header class="queue-head" data-testid="triage-progress">
        <span class="num remaining">{t('triage.remaining', { count: remaining })}</span>
        {#if startedWith > 0}
          <span class="meter" aria-hidden="true"><i style:width="{(done / startedWith) * 100}%"></i></span>
          <span class="quiet num">{t('triage.progress', { done, total: startedWith })}</span>
        {/if}
      </header>
      <ul bind:this={queueList}>
        {#each groups as g (g.key)}
          <li>
            <button
              type="button"
              class:active={g.ids.includes(tx.id)}
              class:skipped={g.ids.every((id) => skipped.includes(id))}
              aria-current={g.ids.includes(tx.id) ? 'true' : undefined}
              onclick={() => pick(g.ids.find((id) => !skipped.includes(id)) ?? g.ids[0])}
            >
              <span class="q-name">{g.label}</span>
              {#if g.ids.length > 1}<span class="q-count num">×{g.ids.length}</span>{/if}
              {#if g.amount}<span class="q-amount"><MoneyAmount amount={g.amount} size="sm" whole /></span
                >{/if}
            </button>
          </li>
        {/each}
      </ul>
      {#if remaining > items.length}
        <p class="quiet more">{t('triage.more', { count: remaining - items.length })}</p>
      {/if}
    </nav>
    <section class="stage">
      {#key tx.id}
        <article
          class="card"
          data-testid="triage-card"
          class:leaving={leaving !== null}
          style="--leave: {leaving ? colorVar(leaving) : 'transparent'}"
        >
          <div class="payment">
            <MoneyAmount amount={tx.amount} size="hero" signed />
            <h2 class="who">{tx.counterparty || tx.description}</h2>
            <p class="where">
              <span>{shortDate(tx.booked_on)}</span>
              <span class="account">{taxonomy.accountsById.get(tx.account_id)?.name ?? ''}</span>
            </p>
            <div class="details">
              <TransactionDetails {tx} compact />
            </div>
            {#if tx.counterparty}
              <label class="rule">
                <input type="checkbox" bind:checked={saveRule} />
                <span>
                  {t('picker.saveRule', { value: tx.counterparty })}
                  {#if saveRule && currentGroup && currentGroup.ids.length > 1}
                    <span class="group-hint">
                      {t('triage.groupRule', {
                        count: currentGroup.ids.length - 1,
                        name: currentGroup.label,
                      })}
                    </span>
                  {/if}
                </span>
              </label>
            {/if}
            <div class="actions">
              <Button variant="ghost" onclick={skip}>{t('triage.skip')} <kbd>S</kbd></Button>
              <OwnTransferAction {tx} ondone={() => void next()} />
            </div>
          </div>

          <div class="choose">
            {#if suggestion}
              <button type="button" class="suggestion" onclick={() => assign(suggestion)}>
                <CategoryIcon
                  colorKey={taxonomy.colorKey(suggestion)}
                  icon={taxonomy.icon(suggestion)}
                  size={32}
                />
                <span class="name">
                  <span class="hint">{t('triage.suggestion')}</span>
                  <strong>{taxonomy.label(suggestion)}</strong>
                  {#if taxonomy.parentLabel(suggestion)}<span class="parent"
                      >{taxonomy.parentLabel(suggestion)}</span
                    >{/if}
                </span>
                {#if top}<span class="num confidence">{Math.round(top.confidence * 100)} %</span>{/if}
                <kbd>⏎</kbd>
              </button>
              {#if top?.reasons.length}
                <p class="reasons">{t('learn.because', { words: top.reasons.join(', ') })}</p>
              {/if}
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
                    <CategoryIcon colorKey={taxonomy.colorKey(id)} icon={taxonomy.icon(id)} size={26} />
                    <kbd>{i + 1}</kbd>
                    <span class="name">
                      <span>{taxonomy.label(id)}</span>
                      {#if taxonomy.parentLabel(id)}<span class="parent">{taxonomy.parentLabel(id)}</span
                        >{/if}
                    </span>
                    {#if confidenceOf.get(id) && i > 0}<span class="num pick-pct"
                        >{Math.round((confidenceOf.get(id) ?? 0) * 100)} %</span
                      >{/if}
                  </button>
                </li>
              {/each}
            </ol>
            <CategoryPicker bind:open={pickerOpen} onpick={(id) => assign(id)}>
              {#snippet trigger(props)}
                <button {...props} type="button" class="other">{t('picker.placeholder')}</button>
              {/snippet}
            </CategoryPicker>
            <p class="keys">{t('triage.keys')}</p>
          </div>
        </article>
      {/key}
      {@render followUps()}
    </section>
  </div>
{/if}

<style>
  .title {
    margin: 0 0 20px;
    font-size: var(--text-headline);
  }
  .split {
    display: grid;
    grid-template-columns: minmax(200px, 250px) minmax(0, 1fr);
    gap: 20px;
    align-items: stretch;
    margin-bottom: 40px;
  }
  .queue {
    position: sticky;
    top: 16px;
    align-self: start;
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 220px);
    box-sizing: border-box;
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 8px;
  }
  .queue-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    padding: 8px 10px 12px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--line);
    font-size: var(--text-micro);
  }
  .remaining {
    flex-basis: 100%;
    font-weight: 700;
    font-size: var(--text-body);
  }
  .meter {
    display: block;
    flex: 1;
    min-width: 60px;
    height: 6px;
    border-radius: 3px;
    background: var(--line);
    overflow: hidden;
  }
  .meter i {
    display: block;
    height: 100%;
    background: var(--brand);
    transition: width 200ms ease;
  }
  .queue ul {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--line) transparent;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .queue button {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: baseline;
    gap: 8px;
    width: 100%;
    padding: 9px 10px;
    border: 0;
    border-radius: 10px;
    background: none;
    font: inherit;
    text-align: left;
    color: var(--ink);
    cursor: pointer;
  }
  .queue button:hover {
    background: color-mix(in oklch, var(--ink) 5%, transparent);
  }
  .queue button.active {
    background: color-mix(in oklch, var(--brand) 14%, transparent);
    font-weight: 650;
  }
  .queue button.skipped {
    opacity: 0.5;
  }
  .q-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .q-count {
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .more {
    margin: 8px 10px;
    font-size: var(--text-micro);
  }
  .stage {
    container-type: inline-size;
    display: grid;
    align-content: start;
    gap: 18px;
    min-width: 0;
  }
  .card {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    border-radius: 24px;
    background: var(--surface);
    box-shadow: var(--shadow-float);
    animation: arrive 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .card.leaving {
    transform: translateX(120%) rotate(4deg);
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
  .payment {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 26px 24px 20px;
    border-right: 1px solid var(--line);
  }
  .choose {
    display: grid;
    align-content: start;
    gap: 12px;
    padding: 22px 22px 20px;
  }
  @container (max-width: 600px) {
    .card {
      grid-template-columns: minmax(0, 1fr);
    }
    .payment {
      border-right: 0;
      border-bottom: 1px solid var(--line);
    }
  }
  /* Below this the queue beside the card would squeeze the card into one column. */
  @media (max-width: 1240px) {
    .split {
      grid-template-columns: minmax(0, 1fr);
      gap: 14px;
    }
    .queue {
      position: static;
      flex-direction: row;
      align-items: center;
      max-height: none;
      padding: 6px;
    }
    .queue-head {
      flex: none;
      width: 150px;
      margin: 0 6px 0 0;
      padding: 4px 12px 4px 8px;
      border-bottom: 0;
      border-right: 1px solid var(--line);
    }
    .queue ul {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .queue li {
      flex: none;
    }
    .queue button {
      width: auto;
      max-width: 240px;
    }
    .more {
      flex: none;
      white-space: nowrap;
    }
  }
  @media (max-width: 600px) {
    .queue {
      flex-direction: column;
      align-items: stretch;
    }
    .queue-head {
      width: auto;
      margin: 0 0 4px;
      border-right: 0;
      border-bottom: 1px solid var(--line);
    }
  }
  .who {
    margin: 10px 0 0;
    font-size: var(--text-title);
    font-weight: 750;
    overflow-wrap: anywhere;
  }
  .where {
    margin: 0 0 10px;
    color: var(--ink-soft);
  }
  .account {
    margin-left: 12px;
    color: var(--ink-faint);
  }
  .details {
    box-sizing: border-box;
    width: 100%;
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--canvas);
  }
  .rule {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 14px;
    font-size: var(--text-micro);
    color: var(--ink-soft);
    cursor: pointer;
  }
  .group-hint {
    display: block;
    color: var(--brand);
    font-weight: 600;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0 4px;
    margin: auto 0 0 -10px;
    padding-top: 14px;
  }
  .suggestion {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 14px 10px 10px;
    border: 0;
    border-radius: 16px;
    background: color-mix(in oklch, var(--brand) 11%, transparent);
    box-shadow: inset 0 0 0 1.5px color-mix(in oklch, var(--brand) 45%, transparent);
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .suggestion:hover {
    background: color-mix(in oklch, var(--brand) 18%, transparent);
  }
  .suggestion .name {
    flex: 1;
  }
  .suggestion strong {
    font-size: var(--text-body);
  }
  .confidence {
    font-size: var(--text-micro);
    font-weight: 700;
    color: var(--brand);
  }
  .reasons {
    margin: -6px 0 0;
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .hint {
    font-size: var(--text-micro);
    font-weight: 600;
    color: var(--brand);
  }
  .name {
    display: grid;
    min-width: 0;
    text-align: left;
    line-height: 1.2;
  }
  .parent {
    font-size: var(--text-micro);
    font-weight: 500;
    color: var(--ink-faint);
  }
  .picks {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .picks button {
    position: relative;
    display: grid;
    justify-items: start;
    align-content: start;
    gap: 8px;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 10px;
    border-radius: 14px;
    border: 0;
    background: color-mix(in oklch, var(--c) 10%, transparent);
    color: var(--ink);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .picks button:hover:not(:disabled) {
    background: color-mix(in oklch, var(--c) 22%, transparent);
  }
  .picks .name span:first-child {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
  .picks kbd {
    position: absolute;
    top: 8px;
    right: 8px;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 6px;
    background: var(--surface);
    box-shadow: inset 0 0 0 1px var(--line);
    font-size: 11px;
    font-weight: 800;
    color: var(--ink-soft);
  }
  .pick-pct {
    position: absolute;
    right: 10px;
    bottom: 8px;
    font-size: 11px;
    color: var(--ink-faint);
  }
  .other {
    width: 100%;
    padding: 10px 14px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--line);
    color: var(--ink-soft);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .other:hover {
    color: var(--ink);
  }
  kbd {
    font: inherit;
    font-size: 12px;
    color: var(--ink-faint);
  }
  .keys {
    margin: 0;
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .panel.auto {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
  }
  .auto-actions {
    display: flex;
    gap: 10px;
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
