<script lang="ts">
  import { untrack } from 'svelte';
  import { api } from '@coin-book/core/api';
  import { todayISO } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { t } from '@coin-book/core/i18n';
  import { exponent, parseMinor } from '@coin-book/core/money';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import { toasts } from '@coin-book/core/toast';
  import Button from '@coin-book/ui/Button.svelte';

  type Props = {
    isin: string;
    /** Prefilled from a sale whose purchase was never imported. */
    accountId?: string;
    boughtOn?: string;
    quantity?: string;
    costMinor?: number;
    /** The instrument's: a lot's cost never mixes currencies. */
    currency: string;
    onsaved: () => void;
  };

  let { isin, currency, onsaved, ...prefill }: Props = $props();
  const initial = untrack(() => prefill);

  /** The API's limits: numeric(28, 10). */
  const SHARES = /^\d{1,18}(\.\d{1,10})?$/;
  const brokers = $derived(taxonomy.accounts.filter((a) => a.kind === 'broker' && !a.archived));

  let account = $state(initial.accountId ?? '');
  let tradedOn = $state(initial.boughtOn ?? '');
  let quantity = $state(initial.quantity ?? '');
  let price = $state(
    initial.costMinor !== undefined
      ? decimal(
          initial.costMinor,
          untrack(() => currency),
        )
      : '',
  );
  let busy = $state(false);

  $effect(() => {
    if (!account && brokers.length > 0) account = brokers[0].id;
  });

  function decimal(minor: number, of: string) {
    const exp = exponent(of);
    return exp === 0 ? String(minor) : (minor / 10 ** exp).toFixed(exp).replace('.', ',');
  }

  async function save(e: SubmitEvent) {
    e.preventDefault();
    const netMinor = parseMinor(price, currency);
    const shares = quantity.trim().replace(',', '.');
    if (netMinor === null || netMinor < 0 || !SHARES.test(shares) || Number(shares) <= 0) {
      toasts.show(t('investments.manual.invalid'), 'error');
      return;
    }
    busy = true;
    try {
      await api.post('/investments/buys', {
        account_id: account,
        isin,
        traded_on: tradedOn,
        quantity: shares,
        net_minor: netMinor,
        currency,
      });
      toasts.show(t('investments.manual.saved'), 'success');
      onsaved();
    } catch (err) {
      toasts.show(errorText(err), 'error');
    } finally {
      busy = false;
    }
  }
</script>

<form class="manual-buy" onsubmit={save} data-testid="manual-buy-form">
  {#if initial.quantity}<p class="hint">{t('investments.manual.hint')}</p>{/if}
  <label class="field">
    <span>{t('investments.manual.account')}</span>
    <select bind:value={account} required>
      {#each brokers as b (b.id)}<option value={b.id}>{b.name}</option>{/each}
    </select>
  </label>
  <label class="field">
    <span>{t('investments.manual.date')}</span>
    <input type="date" bind:value={tradedOn} required max={todayISO()} />
  </label>
  <label class="field">
    <span>{t('investments.manual.quantity')}</span>
    <input bind:value={quantity} inputmode="decimal" required placeholder="1" size="8" />
  </label>
  <label class="field">
    <span>{t('investments.manual.price')} ({currency})</span>
    <input bind:value={price} inputmode="decimal" required placeholder="0" size="10" />
  </label>
  <Button type="submit" {busy}>{t('investments.manual.save')}</Button>
  <p class="hint">{t('investments.manual.duplicateHint')}</p>
</form>

<style>
  .manual-buy {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 10px 14px;
    padding: 12px 0 4px;
  }
  .hint {
    flex-basis: 100%;
    margin: 0;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .field {
    display: grid;
    gap: 4px;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  input,
  select {
    font: inherit;
    padding: 7px 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--surface);
    color: var(--ink);
  }
</style>
