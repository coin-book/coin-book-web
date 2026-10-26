<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '@coin-book/core/api';
  import { errorText } from '@coin-book/core/errors';
  import { t } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import { toasts } from '@coin-book/core/toast';
  import type { Transaction, TransferCounterpart } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import TransferLeg from '$lib/TransferLeg.svelte';

  type Props = {
    tx: Transaction;
    onpaired: () => void;
  };

  let { tx, onpaired }: Props = $props();

  let counterparts = $state<TransferCounterpart[] | null>(null);
  let loaded = $state<Record<string, Transaction>>({});
  let pairing = $state('');

  onMount(async () => {
    try {
      const res = await api.get<{ counterparts: TransferCounterpart[] }>(`/transfers/${tx.id}/counterparts`);
      const movements = await Promise.all(
        res.counterparts.map((c) => api.get<Transaction>(`/transactions/${c.transaction_id}`)),
      );
      loaded = Object.fromEntries(movements.map((m) => [m.id, m]));
      counterparts = res.counterparts;
    } catch (e) {
      toasts.show(errorText(e), 'error');
      counterparts = [];
    }
  });

  async function pair(counterpart: Transaction) {
    pairing = counterpart.id;
    try {
      const res = await api.put<{ released: string[] }>(`/transfers/${tx.id}/counterpart`, {
        counterpart_tx_id: counterpart.id,
      });
      const account = taxonomy.accountsById.get(counterpart.account_id)?.name ?? '';
      toasts.show(
        t(res.released.length > 0 ? 'ownTransfer.repairedReleased' : 'ownTransfer.repaired', { account }),
        'success',
        'transfer',
      );
      onpaired();
    } catch (e) {
      toasts.show(errorText(e), 'error');
    } finally {
      pairing = '';
    }
  }
</script>

<div data-testid="transfer-counterparts">
  <p class="lead">{t('ownTransfer.counterpartsLead')}</p>
  {#if counterparts?.length === 0}
    <p class="hint">{t('ownTransfer.noCounterparts')}</p>
  {:else if counterparts}
    <ul>
      {#each counterparts as c (c.transaction_id)}
        {@const movement = loaded[c.transaction_id]}
        <li>
          <TransferLeg tx={movement} against={tx} numberMatches={c.number_matches} />
          <div class="pick">
            {#if movement.transfer}<span class="elsewhere">{t('ownTransfer.pairedElsewhere')}</span>{/if}
            <Button
              variant="quiet"
              icon="arrows-left-right"
              busy={pairing === movement.id}
              disabled={!!pairing}
              onclick={() => pair(movement)}>{t('triage.pair')}</Button
            >
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .lead,
  .hint {
    margin: 0;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .lead {
    font-weight: 650;
  }
  ul {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
  }
  li + li {
    border-top: 1px dashed var(--line);
  }
  li > :global(:first-child) {
    flex: 1 1 240px;
  }
  .pick {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }
  .elsewhere {
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
</style>
