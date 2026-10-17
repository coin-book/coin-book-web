<script lang="ts" module>
  export type MappingTarget =
    { account_id: string } | { create: { name: string; kind: string; bank_id?: string } };
</script>

<script lang="ts">
  import { t } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import type { ImportAccount } from '@coin-book/core/types';
  import Icon from '@coin-book/ui/Icon.svelte';
  import BankSelect from './BankSelect.svelte';

  type Props = { account: ImportAccount; target: MappingTarget; onchange: (target: MappingTarget) => void };

  let { account, target, onchange }: Props = $props();

  const NEW = '__new__';
  const kinds = ['current', 'savings', 'pocket', 'fund', 'broker', 'cash', 'card'] as const;

  const sameCurrency = $derived(
    taxonomy.accounts.filter((a) => a.currency === account.currency && !a.archived),
  );
  const selected = $derived('account_id' in target ? target.account_id : NEW);
  const draft = $derived(
    'create' in target
      ? target.create
      : {
          name: account.new_account?.name ?? account.name,
          kind: account.new_account?.kind ?? 'current',
          bank_id: account.new_account?.bank_id ?? '',
        },
  );

  function select(value: string) {
    onchange(value === NEW ? { create: { ...draft } } : { account_id: value });
  }
</script>

<li class="mapping" class:attention={account.needs_mapping}>
  <div class="source">
    <strong>{account.name || account.identity || t('import.newAccountOption')}</strong>
    <span class="meta">
      {#if account.identity}<span class="num">{account.identity}</span>{/if}
      <span class="currency">{account.currency}</span>
    </span>
    <span class="counts">
      <span class="num new">{t('import.rowsNew', { count: account.new })}</span>
      <span class="num dup">{t('import.rowsDuplicate', { count: account.duplicates })}</span>
    </span>
  </div>

  <Icon name="caret-right" size={18} weight="bold" class="arrow" />

  <div class="target">
    <label class="field">
      <span>{t('import.mapTo')}</span>
      <select value={selected} onchange={(e) => select(e.currentTarget.value)}>
        <option value={NEW}>+ {t('import.newAccountOption')}</option>
        {#each sameCurrency as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
      </select>
    </label>
    {#if selected === NEW}
      <div class="create">
        <input
          aria-label={t('import.newAccountName')}
          placeholder={t('import.newAccountName')}
          value={draft.name}
          oninput={(e) => onchange({ create: { ...draft, name: e.currentTarget.value } })}
        />
        <select
          aria-label={t('accounts.kind')}
          value={draft.kind}
          onchange={(e) => onchange({ create: { ...draft, kind: e.currentTarget.value } })}
        >
          {#each kinds as k (k)}<option value={k}>{t(`accounts.kind.${k}`)}</option>{/each}
        </select>
        <BankSelect
          value={draft.bank_id ?? ''}
          onchange={(v) => onchange({ create: { ...draft, bank_id: v } })}
        />
      </div>
    {/if}
    <span class="hint">
      {#if account.needs_mapping}
        <Icon name="warning" size={14} weight="fill" /> {t('import.needsMapping')}
      {:else}
        {t(`import.matched.${account.matched_by}`)}
      {/if}
    </span>
  </div>
</li>

<style>
  .mapping {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1.2fr);
    align-items: center;
    gap: 16px;
    padding: 14px 16px;
    border-radius: 14px;
    background: var(--canvas);
  }
  .mapping.attention {
    box-shadow: inset 0 0 0 1.5px var(--warn);
  }
  .source {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  .source strong {
    overflow-wrap: anywhere;
  }
  .meta,
  .counts {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .currency {
    font-weight: 700;
    color: var(--ink-soft);
  }
  .new {
    color: var(--income);
    font-weight: 650;
  }
  :global(.mapping .arrow) {
    color: var(--ink-faint);
  }
  .target {
    display: grid;
    gap: 8px;
  }
  .field {
    display: grid;
    gap: 4px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-soft);
  }
  .create {
    --field-bg: var(--surface);
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }
  .create :global(select:last-child) {
    grid-column: 1 / -1;
  }
  select,
  input {
    padding: 8px 10px;
    border-radius: var(--radius-input);
    border: 1.5px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-size: var(--text-body);
    font-weight: 500;
    min-width: 0;
  }
  select:focus,
  input:focus {
    border-color: var(--brand);
    outline: none;
  }
  .hint {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .attention .hint {
    color: var(--ink);
    font-weight: 600;
  }
  @media (max-width: 760px) {
    .mapping {
      grid-template-columns: 1fr;
    }
    :global(.mapping .arrow) {
      display: none;
    }
  }
</style>
