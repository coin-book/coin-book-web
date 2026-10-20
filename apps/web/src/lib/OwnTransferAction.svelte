<script lang="ts">
  import { api } from '@coin-book/core/api';
  import { errorText } from '@coin-book/core/errors';
  import { t } from '@coin-book/core/i18n';
  import { formatWhole } from '@coin-book/core/money';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import { toasts } from '@coin-book/core/toast';
  import type { Transaction } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import { queue } from '$lib/queue.svelte';

  type Props = {
    tx: Transaction;
    /** othersChanged: a remembered counterparty turned more transactions into transfers. */
    ondone: (updated: Transaction, othersChanged: boolean) => void;
  };

  let { tx, ondone }: Props = $props();

  let open = $state(false);
  let accountId = $state('');
  let remember = $state(true);
  let busy = $state(false);

  const targets = $derived(taxonomy.accounts.filter((a) => a.id !== tx.account_id && !a.archived));

  function start() {
    accountId = targets[0]?.id ?? '';
    open = true;
  }

  async function refreshed(othersChanged = false) {
    const updated = await api.get<Transaction>(`/transactions/${tx.id}`);
    void queue.refresh();
    ondone(updated, othersChanged);
  }

  async function mark() {
    if (!accountId) return;
    busy = true;
    try {
      const res = await api.put<{ applied_to_other: number }>(`/transfers/${tx.id}/own`, {
        account_id: accountId,
        remember_counterparty: remember && !!tx.counterparty,
      });
      const account = taxonomy.accountsById.get(accountId)?.name ?? '';
      toasts.show(
        res.applied_to_other > 0
          ? t('ownTransfer.markedWithOthers', { account, count: res.applied_to_other })
          : t('ownTransfer.marked', { account }),
        'success',
        'transfer',
      );
      open = false;
      await refreshed(res.applied_to_other > 0);
    } catch (e) {
      toasts.show(errorText(e), 'error');
    } finally {
      busy = false;
    }
  }

  async function unmarkLoanPayment() {
    busy = true;
    try {
      await api.delete(`/transactions/${tx.id}/loan-payment`);
      toasts.show(t('loanPayment.undone'), 'success');
      await refreshed();
    } catch (e) {
      toasts.show(errorText(e), 'error');
    } finally {
      busy = false;
    }
  }

  async function undo() {
    busy = true;
    try {
      await api.delete(`/transfers/${tx.id}`);
      toasts.show(t('ownTransfer.undone'), 'success');
      await refreshed();
    } catch (e) {
      toasts.show(errorText(e), 'error');
    } finally {
      busy = false;
    }
  }
</script>

{#if tx.loan_payment}
  {@const loan = tx.loan_payment}
  <div class="loan" data-testid="loan-payment-mark">
    <a href="/net-worth/{loan.account_id}"
      >{t('loanPayment.label', { account: taxonomy.accountsById.get(loan.account_id)?.name ?? '' })}</a
    >
    <span
      >{t('loanPayment.split', {
        interest: formatWhole(loan.interest_minor, tx.amount.currency),
        principal: formatWhole(loan.principal_minor, tx.amount.currency),
      })}</span
    >
    <Button variant="ghost" icon="x" {busy} onclick={unmarkLoanPayment}>{t('loan.unmark')}</Button>
  </div>
{:else if tx.transfer}
  <Button variant="ghost" icon="x" {busy} onclick={undo}>{t('ownTransfer.undo')}</Button>
{:else if !open}
  <Button variant="ghost" icon="arrows-left-right" onclick={start}>{t('ownTransfer.action')}</Button>
{:else}
  <div class="form" data-testid="own-transfer-form">
    {#if targets.length === 0}
      <p class="hint">{t('ownTransfer.noAccounts')} <a href="/accounts">{t('nav.accounts')}</a></p>
    {:else}
      <label class="field">
        <span>{tx.amount.minor < 0 ? t('ownTransfer.to') : t('ownTransfer.from')}</span>
        <select bind:value={accountId}>
          {#each targets as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
        </select>
      </label>
      {#if tx.counterparty}
        <label class="check">
          <input type="checkbox" bind:checked={remember} />
          {t('ownTransfer.remember', { counterparty: tx.counterparty })}
        </label>
      {/if}
    {/if}
    <div class="actions">
      <Button variant="ghost" type="button" onclick={() => (open = false)}>{t('common.cancel')}</Button>
      {#if targets.length > 0}
        <Button icon="arrows-left-right" {busy} onclick={mark}>{t('ownTransfer.confirm')}</Button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .loan {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .loan a {
    font-weight: 650;
    color: var(--brand);
    text-decoration: none;
  }
  .form {
    display: grid;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 12px;
    background: color-mix(in oklch, var(--transfer) 10%, transparent);
    text-align: left;
  }
  .field {
    display: grid;
    gap: 4px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-soft);
  }
  .field select {
    padding: 8px 10px;
    border-radius: var(--radius-input);
    border: 1.5px solid var(--line);
    background: var(--canvas);
    color: var(--ink);
    font: inherit;
    font-size: var(--text-body);
    font-weight: 500;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .hint {
    margin: 0;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
