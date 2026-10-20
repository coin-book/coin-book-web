<script lang="ts">
  import { shortDate } from '@coin-book/core/dates';
  import { daysWord, t } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import type { Transaction } from '@coin-book/core/types';
  import Icon from '@coin-book/ui/Icon.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';

  type Props = {
    tx: Transaction;
    /** The outgoing leg a candidate is compared with; absent on the outgoing leg itself. */
    against?: Transaction;
    /** The bank names this candidate's account as the counterparty. */
    numberMatches?: boolean;
  };

  let { tx, against, numberMatches = false }: Props = $props();

  const account = $derived(taxonomy.accountsById.get(tx.account_id));

  const daysApart = $derived.by(() => {
    if (!against) return null;
    return Math.round((Date.parse(tx.booked_on) - Date.parse(against.booked_on)) / 86_400_000);
  });

  const timing = $derived.by(() => {
    if (daysApart === null) return '';
    if (daysApart === 0) return t('triage.sameDay');
    const days = Math.abs(daysApart);
    return t(daysApart > 0 ? 'triage.daysLater' : 'triage.daysEarlier', { days, daysWord: daysWord(days) });
  });

  const symbols = $derived(
    [
      tx.variable_symbol && `VS ${tx.variable_symbol}`,
      tx.constant_symbol && `KS ${tx.constant_symbol}`,
      tx.specific_symbol && `SS ${tx.specific_symbol}`,
    ]
      .filter(Boolean)
      .join(' · '),
  );

  const facts = $derived(
    [
      { label: t('triage.counterparty'), value: tx.counterparty },
      { label: t('triage.counterpartyAccount'), value: tx.counterparty_account },
      { label: t('triage.message'), value: tx.message },
      { label: t('triage.symbols'), value: symbols },
      { label: t('triage.operation'), value: tx.operation_type },
    ].filter((f) => f.value),
  );
</script>

<div class="leg" data-testid="transfer-leg" data-tx={tx.id}>
  <div class="top">
    <span class="date">{shortDate(tx.booked_on)}</span>
    {#if timing}<span class="chip">{timing}</span>{/if}
    {#if against && tx.amount.currency !== against.amount.currency}<span class="chip"
        >{t('triage.otherCurrency')}</span
      >{/if}
    {#if numberMatches}<span class="chip match"
        ><Icon name="check" size={12} weight="bold" /> {t('triage.numberMatches')}</span
      >{/if}
    <span class="account">{account?.name ?? ''}</span>
    <MoneyAmount amount={tx.amount} signed />
  </div>
  <p class="description">{tx.description}</p>
  {#if facts.length > 0}
    <dl>
      {#each facts as f (f.label)}
        <dt>{f.label}</dt>
        <dd class:num={f.label === t('triage.counterpartyAccount')}>{f.value}</dd>
      {/each}
    </dl>
  {/if}
</div>

<style>
  .leg {
    min-width: 0;
    padding: 8px 0;
  }
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px 10px;
  }
  .date {
    font-weight: 650;
  }
  .account {
    margin-left: auto;
    color: var(--ink-soft);
    font-size: var(--text-micro);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px 8px;
    border-radius: 999px;
    background: color-mix(in oklch, var(--ink) 7%, transparent);
    color: var(--ink-soft);
    font-size: var(--text-micro);
  }
  .chip.match {
    background: color-mix(in oklch, var(--brand) 14%, transparent);
    color: var(--brand);
    font-weight: 650;
  }
  .description {
    margin: 4px 0 0;
    overflow-wrap: anywhere;
  }
  dl {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 2px 12px;
    margin: 6px 0 0;
    font-size: var(--text-micro);
  }
  dt {
    color: var(--ink-faint);
  }
  dd {
    margin: 0;
    color: var(--ink-soft);
    overflow-wrap: anywhere;
  }
</style>
