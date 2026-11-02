<script lang="ts">
  import { api } from '@coin-book/core/api';
  import { errorText } from '@coin-book/core/errors';
  import { t } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import type { Transaction } from '@coin-book/core/types';
  import TransferLeg from '#lib/TransferLeg.svelte';

  type Props = { tx: Transaction };

  let { tx }: Props = $props();

  let other = $state<Transaction | null>(null);
  let error = $state('');

  const counterpartId = $derived(tx.transfer?.counterpart_tx_id);
  const counterpartAccount = $derived(
    taxonomy.accountsById.get(tx.transfer?.counterpart_account_id ?? '')?.name ?? '',
  );

  $effect(() => {
    const id = counterpartId;
    other = null;
    error = '';
    if (!id) return;
    api
      .get<Transaction>(`/transactions/${id}`)
      .then((loaded) => {
        if (id === counterpartId) other = loaded;
      })
      .catch((e) => (error = errorText(e)));
  });
</script>

<div class="other-leg" data-testid="transfer-other-leg">
  {#if !counterpartId}
    <p class="hint">{t('ownTransfer.otherLegMissing', { account: counterpartAccount })}</p>
  {:else}
    <p class="lead">{t('ownTransfer.otherLeg')}</p>
    {#if other}
      <TransferLeg tx={other} against={tx} />
    {:else if error}
      <p class="hint">{error}</p>
    {/if}
  {/if}
</div>

<style>
  .other-leg {
    text-align: left;
  }
  .lead,
  .hint {
    margin: 0;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .lead {
    font-weight: 650;
  }
</style>
