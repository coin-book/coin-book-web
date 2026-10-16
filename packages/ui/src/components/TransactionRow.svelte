<script lang="ts">
  import { t } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import type { Transaction } from '@coin-book/core/types';
  import CategoryChip from './CategoryChip.svelte';
  import CategoryIcon from './CategoryIcon.svelte';
  import CategoryPicker from './CategoryPicker.svelte';
  import MoneyAmount from './MoneyAmount.svelte';

  type Props = {
    tx: Transaction;
    selected?: boolean;
    pickerOpen?: boolean;
    showAccount?: boolean;
    oncategorize?: (tx: Transaction, categoryId: string, saveRule: boolean) => void;
    onselect?: () => void;
  };

  let {
    tx,
    selected = false,
    pickerOpen = $bindable(false),
    showAccount = true,
    oncategorize,
    onselect,
  }: Props = $props();

  const primary = $derived(tx.categories?.[0]?.category_id);
  const isSplit = $derived((tx.categories?.length ?? 0) > 1);
  const counterpart = $derived(
    tx.transfer ? taxonomy.accountsById.get(tx.transfer.counterpart_account_id) : undefined,
  );
  const account = $derived(taxonomy.accountsById.get(tx.account_id));
  const title = $derived(tx.counterparty || tx.description);
  // mBank's raw description repeats the counterparty and account numbers; the message or operation says more.
  const subtitle = $derived(
    tx.message ||
      operationLabel(tx.operation_type) ||
      (tx.counterparty && tx.description !== tx.counterparty ? tx.description : ''),
  );

  // Revolut operation types are codes (merchant, topup…); mBank's are already Czech text.
  const operationCodes = ['merchant', 'topup', 'exchange'] as const;
  function operationLabel(op: string | undefined): string {
    if (!op || op === 'other') return '';
    return (operationCodes as readonly string[]).includes(op)
      ? t(`op.${op as (typeof operationCodes)[number]}`)
      : op;
  }
  const ruleValue = $derived(tx.counterparty ?? null);
</script>

<div class="row-wrap">
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="row"
    class:selected
    class:transfer={!!tx.transfer}
    role="row"
    tabindex="-1"
    onclick={onselect}
    data-tx={tx.id}
  >
    {#if tx.transfer}
      <CategoryIcon colorKey="transfer" icon="arrows-left-right" size={36} />
    {:else}
      <CategoryIcon
        colorKey={taxonomy.colorKey(primary)}
        icon={primary ? taxonomy.icon(primary) : 'question'}
        size={36}
      />
    {/if}

    <div class="text">
      <div class="title">{title}</div>
      <div class="meta">
        {#if subtitle}<span class="desc">{subtitle}</span>{/if}
        {#if showAccount && account}<span class="account">{account.name}</span>{/if}
      </div>
    </div>

    <div class="category">
      {#if tx.transfer}
        <span class="transfer-label">
          {tx.amount.minor < 0
            ? t('tx.transferTo', { account: counterpart?.name ?? '' })
            : t('tx.transferFrom', { account: counterpart?.name ?? '' })}
        </span>
      {:else if oncategorize}
        <CategoryPicker bind:open={pickerOpen} {ruleValue} onpick={(id, rule) => oncategorize(tx, id, rule)}>
          {#snippet trigger(props)}
            <button {...props} type="button" class="chip-trigger">
              <CategoryChip
                colorKey={taxonomy.colorKey(primary)}
                label={isSplit ? t('tx.split') : primary ? taxonomy.label(primary) : t('tx.uncategorized')}
                muted={!primary}
              />
            </button>
          {/snippet}
        </CategoryPicker>
      {:else}
        <CategoryChip
          colorKey={taxonomy.colorKey(primary)}
          label={primary ? taxonomy.label(primary) : t('tx.uncategorized')}
          muted={!primary}
        />
      {/if}
    </div>

    <div class="amount">
      <MoneyAmount amount={tx.amount} signed />
    </div>
  </div>
</div>

<style>
  .row-wrap {
    container-type: inline-size;
  }
  .row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) minmax(0, 220px) auto;
    align-items: center;
    gap: 14px;
    padding: 10px 14px;
    border-radius: 14px;
    outline: none;
  }
  .row:hover {
    background: color-mix(in oklch, var(--ink) 3.5%, transparent);
  }
  .row.selected {
    background: color-mix(in oklch, var(--brand) 9%, transparent);
    box-shadow: inset 3px 0 0 var(--brand);
  }
  .text {
    min-width: 0;
  }
  .title {
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    display: flex;
    gap: 10px;
    font-size: var(--text-micro);
    color: var(--ink-faint);
    min-width: 0;
  }
  .desc {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .account {
    flex: none;
  }
  .category {
    min-width: 0;
    justify-self: start;
  }
  .chip-trigger {
    border: 0;
    padding: 0;
    background: none;
    cursor: pointer;
    max-width: 100%;
    border-radius: 999px;
  }
  .transfer-label {
    font-size: var(--text-micro);
    font-weight: 600;
    color: var(--transfer);
  }
  .transfer .amount {
    opacity: 0.7;
  }
  .amount {
    text-align: right;
  }
  @container (max-width: 600px) {
    .row {
      grid-template-columns: auto minmax(0, 1fr) auto;
      grid-template-areas: 'icon text amount' 'icon category category';
      row-gap: 6px;
    }
    .row > :global(:first-child) {
      grid-area: icon;
      align-self: start;
    }
    .text {
      grid-area: text;
    }
    .category {
      grid-area: category;
    }
    .amount {
      grid-area: amount;
    }
  }
</style>
