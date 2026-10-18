<script lang="ts" module>
  export const FIELDS = [
    'date',
    'amount',
    'credit',
    'debit',
    'currency',
    'description',
    'counterparty',
    'counterparty_account',
    'bank_code',
    'message',
    'vs',
    'ks',
    'ss',
    'balance_after',
    'id',
  ] as const;
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { api } from '@coin-book/core/api';
  import { errorText } from '@coin-book/core/errors';
  import { t } from '@coin-book/core/i18n';
  import type { ColumnLayout, Inspection } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import Icon from '@coin-book/ui/Icon.svelte';

  type Props = {
    file: File;
    inspection: Inspection;
    busy: boolean;
    /** templateName is empty when the user does not want the layout remembered. */
    onpreview: (layout: ColumnLayout, templateName: string) => void;
    oncancel: () => void;
  };

  let { file, inspection, busy, onpreview, oncancel }: Props = $props();

  const delimiters = [';', ',', '\t', '|'] as const;

  // The mapper edits its own copy; the parent remounts it for another file.
  const initial = untrack(() => ({ inspection, fileName: file.name }));
  let rows = $state(initial.inspection.rows);
  let layout = $state<ColumnLayout>($state.snapshot(initial.inspection.suggested));
  let templateName = $state(initial.inspection.template?.name ?? initial.fileName.replace(/\.[^.]+$/, ''));
  let remember = $state(true);
  let reading = $state(false);
  let error = $state('');

  const width = $derived(Math.max(0, ...rows.map((r) => r.length)));
  const fieldAt = $derived(
    Object.fromEntries(Object.entries(layout.columns).map(([field, column]) => [column, field])),
  );
  const has = (field: string) => field in layout.columns;
  const missing = $derived.by(() => {
    const out: string[] = [];
    if (!has('date')) out.push(t('mapper.needDate'));
    if (has('amount') === (has('credit') || has('debit'))) out.push(t('mapper.needAmount'));
    if (!has('description') && !has('counterparty') && !has('message')) out.push(t('mapper.needDescription'));
    if (!has('currency') && !/^[A-Z]{3}$/.test(layout.currency ?? '')) out.push(t('mapper.needCurrency'));
    return out;
  });

  function assign(column: number, field: string) {
    const columns = Object.fromEntries(
      Object.entries(layout.columns).filter(([f, c]) => c !== column && f !== field),
    );
    if (field) columns[field] = column;
    layout.columns = columns;
  }

  // Another encoding or delimiter splits the file differently, so the guess starts over.
  async function reread(encoding: string, delimiter: string) {
    reading = true;
    error = '';
    try {
      const fresh = await api.upload<Inspection>('/imports/inspect', file, undefined, {
        encoding,
        delimiter,
      });
      rows = fresh.rows;
      layout = fresh.suggested;
    } catch (e) {
      error = errorText(e);
    } finally {
      reading = false;
    }
  }
</script>

<div class="mapper" aria-busy={reading}>
  <div class="head">
    <h2 class="display">{t('mapper.title', { file: file.name })}</h2>
    <p>{t('mapper.lead')}</p>
    {#if inspection.template}
      <p class="template">
        <Icon name="tag" size={16} weight="fill" />{t('mapper.fromTemplate', {
          name: inspection.template.name,
        })}
      </p>
    {/if}
  </div>

  <div class="settings">
    <label class="field">
      <span>{t('mapper.encoding')}</span>
      <select value={layout.encoding} onchange={(e) => reread(e.currentTarget.value, layout.delimiter)}>
        <option value="utf-8">UTF-8</option>
        <option value="windows-1250">Windows-1250</option>
      </select>
    </label>
    <label class="field">
      <span>{t('mapper.delimiter')}</span>
      <select value={layout.delimiter} onchange={(e) => reread(layout.encoding, e.currentTarget.value)}>
        {#each delimiters as d (d)}<option value={d}>{t(`mapper.delimiter.${d === '\t' ? 'tab' : d}`)}</option
          >{/each}
      </select>
    </label>
    <label class="field">
      <span>{t('mapper.dateOrder')}</span>
      <select bind:value={layout.date_order}>
        <option value="dmy">{t('mapper.dateOrder.dmy')}</option>
        <option value="mdy">{t('mapper.dateOrder.mdy')}</option>
        <option value="ymd">{t('mapper.dateOrder.ymd')}</option>
      </select>
    </label>
    {#if !has('currency')}
      <label class="field">
        <span>{t('mapper.currency')}</span>
        <input
          class="currency"
          maxlength="3"
          value={layout.currency ?? ''}
          oninput={(e) => (layout.currency = e.currentTarget.value.toUpperCase())}
        />
      </label>
    {/if}
  </div>

  <p class="hint">{t('mapper.headerHint')}</p>
  <div class="cells-scroll">
    <table class="cells">
      <thead>
        <tr>
          <th></th>
          {#each { length: width } as _, column (column)}
            <th>
              <select
                aria-label={t('mapper.columnField', { column: column + 1 })}
                class:assigned={fieldAt[column]}
                value={fieldAt[column] ?? ''}
                onchange={(e) => assign(column, e.currentTarget.value)}
                data-testid="column-field"
              >
                <option value="">{t('mapper.field.none')}</option>
                {#each FIELDS as f (f)}<option value={f}>{t(`mapper.field.${f}`)}</option>{/each}
              </select>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as row, index (index)}
          <tr class:before={index < layout.header_row} class:names={index === layout.header_row}>
            <td>
              <button
                type="button"
                class="line num"
                aria-pressed={index === layout.header_row}
                title={t('mapper.setHeader')}
                onclick={() => (layout.header_row = index)}>{index + 1}</button
              >
            </td>
            {#each { length: width } as _, column (column)}
              <td class:assigned={fieldAt[column]}>{row[column] ?? ''}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="remember">
    <label class="check">
      <input type="checkbox" bind:checked={remember} />
      {t('mapper.remember')}
    </label>
    {#if remember}
      <input
        aria-label={t('mapper.templateName')}
        placeholder={t('mapper.templateName')}
        bind:value={templateName}
        maxlength="80"
      />
    {/if}
  </div>

  {#if missing.length}
    <ul class="missing" data-testid="mapper-missing">
      {#each missing as m (m)}<li><Icon name="warning" size={14} weight="fill" />{m}</li>{/each}
    </ul>
  {/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}

  <div class="actions">
    <Button variant="ghost" onclick={oncancel}>{t('mapper.cancel')}</Button>
    <Button
      busy={busy || reading}
      disabled={missing.length > 0 || (remember && !templateName.trim())}
      onclick={() => onpreview($state.snapshot(layout), remember ? templateName.trim() : '')}
    >
      {t('mapper.preview')}
    </Button>
  </div>
</div>

<style>
  .mapper {
    display: grid;
    gap: 16px;
  }
  .head h2 {
    margin: 0 0 6px;
    font-size: var(--text-title);
    overflow-wrap: anywhere;
  }
  .head p {
    margin: 0;
    color: var(--ink-soft);
  }
  .head .template {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    color: var(--brand);
    font-weight: 600;
  }
  .settings {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .field {
    display: grid;
    gap: 4px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-soft);
  }
  select,
  input:not([type='checkbox']) {
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
  .currency {
    width: 5em;
    text-transform: uppercase;
  }
  .hint {
    margin: 0;
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .cells-scroll {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: 12px;
  }
  .cells {
    border-collapse: collapse;
    font-size: var(--text-micro);
    white-space: nowrap;
  }
  .cells th {
    position: sticky;
    top: 0;
    padding: 8px 6px;
    background: var(--canvas);
    text-align: left;
  }
  .cells th select {
    font-size: var(--text-micro);
    padding: 6px 8px;
    max-width: 14em;
  }
  .cells th select.assigned {
    border-color: var(--brand);
    color: var(--brand);
    font-weight: 650;
  }
  .cells td {
    padding: 6px 10px;
    border-top: 1px solid var(--line);
    max-width: 22em;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cells td.assigned {
    background: color-mix(in oklch, var(--brand) 6%, transparent);
  }
  tr.before td {
    color: var(--ink-faint);
  }
  tr.names td {
    font-weight: 700;
    color: var(--ink);
    background: color-mix(in oklch, var(--brand) 12%, transparent);
  }
  .line {
    min-width: 2.2em;
    padding: 2px 6px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--ink-faint);
    font: inherit;
    cursor: pointer;
  }
  .line[aria-pressed='true'] {
    background: var(--brand);
    color: var(--brand-ink);
  }
  .remember {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .missing {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--ink-soft);
  }
  .missing li {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .missing :global(svg) {
    color: var(--warn);
  }
  .error {
    margin: 0;
    color: var(--over);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
  }
</style>
