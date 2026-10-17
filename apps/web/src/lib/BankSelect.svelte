<script lang="ts">
  import { t } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';

  type Props = {
    value: string;
    onchange: (value: string) => void;
    /** Label of the empty choice: "detect from the number" when creating, "none" when editing. */
    emptyLabel?: string;
    label?: string;
  };

  let { value, onchange, emptyLabel = t('bank.none'), label = t('bank.label') }: Props = $props();

  const groups = $derived([
    { label: t('bank.country.CZ'), banks: taxonomy.banks.filter((b) => b.country === 'CZ') },
    { label: t('bank.country.SK'), banks: taxonomy.banks.filter((b) => b.country === 'SK') },
    { label: t('bank.country.other'), banks: taxonomy.banks.filter((b) => !b.country) },
  ]);
</script>

<select aria-label={label} {value} onchange={(e) => onchange(e.currentTarget.value)}>
  <option value="">{emptyLabel}</option>
  {#each groups as g (g.label)}
    <optgroup label={g.label}>
      {#each g.banks as b (b.id)}
        <option value={b.id}>{b.short_name}{b.code ? ` (${b.code})` : ''}</option>
      {/each}
    </optgroup>
  {/each}
</select>

<style>
  select {
    padding: 8px 10px;
    border-radius: var(--radius-input);
    border: 1.5px solid var(--line);
    background: var(--field-bg, var(--canvas));
    color: var(--ink);
    font: inherit;
    font-size: var(--text-body);
    font-weight: 500;
    min-width: 0;
    max-width: 100%;
  }
  select:focus {
    border-color: var(--brand);
    outline: none;
  }
</style>
