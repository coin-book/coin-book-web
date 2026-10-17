<script lang="ts">
  import { dayLabel } from '@coin-book/core/dates';
  import { i18n, t } from '@coin-book/core/i18n';
  import { formatMoney } from '@coin-book/core/money';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import type { Transaction } from '@coin-book/core/types';

  type Props = { tx: Transaction; compact?: boolean };

  let { tx, compact = false }: Props = $props();

  // Revolut operation types are codes; mBank's are Czech text already.
  const operationCodes = ['merchant', 'topup', 'exchange'] as const;
  function operation(op: string | undefined): string {
    if (!op || op === 'other') return '';
    return (operationCodes as readonly string[]).includes(op)
      ? t(`op.${op as (typeof operationCodes)[number]}`)
      : op;
  }

  const bank = $derived(taxonomy.bankOfNumber(tx.counterparty_account));
  const symbols = $derived(
    [
      tx.variable_symbol && `VS ${tx.variable_symbol}`,
      tx.constant_symbol && `KS ${tx.constant_symbol}`,
      tx.specific_symbol && `SS ${tx.specific_symbol}`,
    ]
      .filter(Boolean)
      .join(', '),
  );
  const account = $derived(taxonomy.accountsById.get(tx.account_id));
  // Revolut's "category" is the kind of operation, already shown as the operation type.
  const bankCategory = $derived(account?.institution === 'revolut' ? '' : (tx.bank_category ?? ''));

  const rows = $derived(
    [
      [t('tx.counterparty'), tx.counterparty ?? ''],
      [t('tx.description'), tx.description !== tx.counterparty ? tx.description : ''],
      [t('tx.message'), tx.message ?? ''],
      [
        t('tx.counterpartyAccount'),
        tx.counterparty_account ? `${tx.counterparty_account}${bank ? `, ${bank.name}` : ''}` : '',
      ],
      [t('tx.symbols'), symbols],
      [t('tx.operation'), operation(tx.operation_type)],
      [t('tx.bankCategory'), bankCategory],
      [t('tx.fee'), tx.fee_minor ? formatMoney({ minor: tx.fee_minor, currency: tx.amount.currency }) : ''],
      [
        t('tx.balanceAfter'),
        tx.balance_after_minor !== undefined && tx.balance_after_minor !== null
          ? formatMoney({ minor: tx.balance_after_minor, currency: tx.amount.currency })
          : '',
      ],
      ...(compact
        ? []
        : [
            [t('tx.date'), dayLabel(tx.booked_on, i18n.intlLocale)],
            [t('tx.account'), account?.name ?? ''],
            [t('tx.origin'), t('tx.source', { line: tx.source_line })],
          ]),
    ].filter(([, value]) => value),
  );
</script>

<dl class="details" class:compact>
  {#each rows as [label, value] (label)}
    <dt>{label}</dt>
    <dd>{value}</dd>
  {/each}
</dl>

<style>
  .details {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 6px 16px;
    margin: 0;
    text-align: left;
    font-size: var(--text-micro);
  }
  dt {
    color: var(--ink-faint);
    white-space: nowrap;
  }
  dd {
    margin: 0;
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .compact {
    gap: 4px 14px;
  }
</style>
