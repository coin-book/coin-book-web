<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiError } from '@coin-book/core/api';
  import { shortDate } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { i18n, t } from '@coin-book/core/i18n';
  import { formatMoney } from '@coin-book/core/money';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import { toasts } from '@coin-book/core/toast';
  import type { ImportBatch, ImportResult } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import Icon from '@coin-book/ui/Icon.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import AccountMapping, { type MappingTarget } from '$lib/AccountMapping.svelte';
  import { queue } from '$lib/queue.svelte';

  const TEMPLATE =
    'date;amount;currency;description;counterparty;category\n' +
    '2026-10-14;-1249,00;CZK;Nákup potravin;ROHLIK.CZ;Potraviny a drogerie\n' +
    '2026-10-15;62000,00;CZK;Výplata;FIRMA S.R.O.;income.salary\n';
  const REPREVIEW_MS = 350;

  let file = $state<File | null>(null);
  let preview = $state<ImportResult | null>(null);
  let history = $state<ImportBatch[]>([]);
  let dragging = $state(false);
  let busy = $state(false);
  let error = $state('');
  let input = $state<HTMLInputElement>();
  let mapping = $state<Record<string, MappingTarget>>({});
  let reviewTimer: ReturnType<typeof setTimeout>;

  onMount(() => void loadHistory());

  async function loadHistory() {
    history = (await api.get<{ imports: ImportBatch[] }>('/imports')).imports;
  }

  async function choose(f: File | undefined) {
    if (!f) return;
    file = f;
    error = '';
    preview = null;
    busy = true;
    try {
      mapping = {};
      preview = await api.upload<ImportResult>('/imports/preview', f);
      mapping = Object.fromEntries(
        preview.accounts.map((a) => [
          a.key,
          a.account_id
            ? { account_id: a.account_id }
            : {
                create: {
                  name: a.new_account?.name ?? a.name,
                  kind: a.new_account?.kind ?? 'current',
                  bank_id: a.new_account?.bank_id ?? '',
                },
              },
        ]),
      );
    } catch (e) {
      error = errorText(e);
      file = null;
    } finally {
      busy = false;
    }
  }

  async function commit(force = false) {
    if (!file) return;
    busy = true;
    try {
      const done = await api.upload<ImportResult>('/imports', file, { force }, mappingField());
      toasts.show(t('import.done', { count: done.rows_new }), 'success');
      toasts.show(
        t('import.doneDetail', {
          rule: done.categorized_by_rule + done.categorized_by_file + done.categorized_by_model,
          bank: done.categorized_by_bank,
          transfers: done.transfers_matched + done.own_transfers,
        }),
      );
      preview = null;
      file = null;
      await Promise.all([loadHistory(), taxonomy.reloadAccounts(), queue.refresh()]);
    } catch (e) {
      toasts.show(errorText(e), 'error');
      if (e instanceof ApiError && e.code === 'already_imported') preview = null;
    } finally {
      busy = false;
    }
  }

  async function rollback(batch: ImportBatch) {
    if (!confirm(t('import.rollbackConfirm', { count: batch.rows_inserted }))) return;
    try {
      const res = await api.post<{ removed: number }>(`/imports/${batch.id}/rollback`);
      toasts.show(t('import.rolledBack', { count: res.removed }), 'success');
      await Promise.all([loadHistory(), taxonomy.reloadAccounts(), queue.refresh()]);
    } catch (e) {
      toasts.show(errorText(e), 'error');
    }
  }

  function mappingField(): Record<string, string> {
    return { mapping: JSON.stringify(mapping) };
  }

  // Counts of new and known rows depend on the target account, so the preview follows the mapping.
  function remap(key: string, target: MappingTarget) {
    mapping[key] = target;
    clearTimeout(reviewTimer);
    reviewTimer = setTimeout(async () => {
      if (!file) return;
      try {
        preview = await api.upload<ImportResult>('/imports/preview', file, undefined, mappingField());
      } catch (e) {
        toasts.show(errorText(e), 'error');
      }
    }, REPREVIEW_MS);
  }

  const missingName = $derived(Object.values(mapping).some((m) => 'create' in m && !m.create.name.trim()));

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob(['\ufeff' + TEMPLATE], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coin-book-sablona.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function ondrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    void choose(e.dataTransfer?.files[0]);
  }

  const failedAccount = $derived(preview?.accounts.find((a) => a.checks.some((c) => !c.ok)));
  const failedCheck = $derived(failedAccount?.checks.find((c) => !c.ok));
</script>

<svelte:window
  ondragover={(e) => {
    e.preventDefault();
    dragging = true;
  }}
  ondragleave={(e) => {
    if (!e.relatedTarget) dragging = false;
  }}
  {ondrop}
/>
<svelte:head><title>{t('import.title')} · coin-book</title></svelte:head>

<h1 class="display title">{t('import.title')}</h1>

{#if !preview}
  <section class="drop" class:dragging aria-busy={busy}>
    <span class="glyph"><Icon name="upload-simple" size={34} weight="duotone" /></span>
    <h2 class="display">{t('import.drop')}</h2>
    <p>{t('import.dropLead')}</p>
    <input
      bind:this={input}
      type="file"
      accept=".csv,text/csv,.gpc,.abo,.txt"
      hidden
      onchange={(e) => choose(e.currentTarget.files?.[0])}
    />
    <Button variant="quiet" {busy} onclick={() => input?.click()}>{t('import.choose')}</Button>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  </section>

  <details class="panel format">
    <summary>{t('import.formatTitle')}</summary>
    <p>{t('import.formatLead')}</p>
    <p>{t('import.formatRequired')}</p>
    <p>{t('import.formatOptional')}</p>
    <Button variant="quiet" icon="download-simple" onclick={downloadTemplate}>{t('import.template')}</Button>
  </details>
{:else}
  <section class="panel preview">
    <div class="preview-head">
      <h2 class="display">{t('import.previewOf', { file: preview.file_name })}</h2>
      {#if preview.period_from && preview.period_to}
        <span class="period">{shortDate(preview.period_from)} – {shortDate(preview.period_to)}</span>
      {/if}
    </div>

    {#if preview.already_imported}
      <p class="verdict warn"><Icon name="warning" size={22} weight="fill" />{t('import.alreadyImported')}</p>
    {:else if preview.checks_passed}
      <p class="verdict ok"><Icon name="check-circle" size={26} weight="fill" />{t('import.checksOk')}</p>
    {:else if failedCheck}
      <div class="verdict bad">
        <Icon name="warning" size={26} weight="fill" />
        <div>
          <strong>{t('import.checksFailed')}</strong>
          <p>
            {t('import.checksFailedLead', {
              difference: formatMoney({
                minor: Math.abs(failedCheck.expected_minor - failedCheck.actual_minor),
                currency: failedAccount?.currency ?? 'CZK',
              }),
            })}
          </p>
        </div>
      </div>
    {/if}

    <ul class="accounts">
      {#each preview.accounts as a (a.key)}
        {#if mapping[a.key]}
          <AccountMapping account={a} target={mapping[a.key]} onchange={(target) => remap(a.key, target)} />
        {/if}
      {/each}
    </ul>

    <div class="rows">
      {#each preview.rows as row (row.account_key + row.line)}
        <div class="row" class:duplicate={row.status === 'duplicate'}>
          <span class="date num">{shortDate(row.booked_on)}</span>
          <span class="desc">{row.description}</span>
          <MoneyAmount amount={row.amount} signed />
        </div>
      {/each}
    </div>
    {#if preview.rows.length < preview.rows_total}
      <p class="showing">{t('import.showing', { count: preview.rows.length })}</p>
    {/if}

    <div class="actions">
      <Button variant="ghost" onclick={() => ((preview = null), (file = null))}>{t('import.discard')}</Button>
      {#if !preview.already_imported}
        {#if preview.checks_passed}
          <Button {busy} disabled={preview.rows_new === 0 || missingName} onclick={() => commit(false)}>
            {t('import.commit', { count: preview.rows_new })}
          </Button>
        {:else}
          <Button variant="danger" {busy} disabled={missingName} onclick={() => commit(true)}>
            {t('import.commitAnyway')}
          </Button>
        {/if}
      {/if}
    </div>
  </section>
{/if}

<section class="panel">
  <h2 class="section-title">{t('import.history')}</h2>
  {#if history.length === 0}
    <p class="quiet">{t('import.historyEmpty')}</p>
  {:else}
    <ul class="history">
      {#each history as b (b.id)}
        <li class:rolled={b.status === 'rolled_back'}>
          <div>
            <strong>{b.file_name}</strong>
            <span class="meta">
              {new Date(b.created_at).toLocaleString(i18n.intlLocale)}
              {#if b.period_from && b.period_to}, {shortDate(b.period_from)} – {shortDate(b.period_to)}{/if}
            </span>
          </div>
          <span class="num">{t('import.rowsNew', { count: b.rows_inserted })}</span>
          {#if b.forced}<span class="tag warn">{t('import.forced')}</span>{/if}
          {#if b.status === 'rolled_back'}
            <span class="tag">{t('import.statusRolledBack')}</span>
          {:else}
            <Button variant="ghost" icon="trash" onclick={() => rollback(b)}>{t('import.rollback')}</Button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

{#if dragging}<div class="drag-veil" aria-hidden="true"><span>{t('import.drop')}</span></div>{/if}

<style>
  .title {
    margin: 0 0 20px;
    font-size: var(--text-headline);
  }
  .drop {
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 48px 20px;
    margin-bottom: 18px;
    border-radius: 22px;
    border: 2px dashed color-mix(in oklch, var(--brand) 35%, transparent);
    background: color-mix(in oklch, var(--brand) 5%, var(--surface));
    text-align: center;
  }
  .drop h2 {
    margin: 0;
    font-size: var(--text-title);
  }
  .drop p {
    margin: 0 0 8px;
    max-width: 52ch;
    color: var(--ink-soft);
  }
  .glyph {
    color: var(--brand);
  }
  .drag-veil {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: grid;
    place-items: center;
    background: color-mix(in oklch, var(--brand) 78%, transparent);
    color: var(--brand-ink);
    font-family: var(--font-display);
    font-size: var(--text-headline);
    font-weight: 700;
    pointer-events: none;
  }
  .panel {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 22px 24px;
    margin-bottom: 18px;
  }
  .preview-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 14px;
  }
  .preview-head h2 {
    margin: 0;
    font-size: var(--text-title);
    overflow-wrap: anywhere;
  }
  .period {
    color: var(--ink-soft);
  }
  .verdict {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 16px 0;
    padding: 14px 16px;
    border-radius: 14px;
    font-weight: 650;
  }
  .verdict p {
    margin: 4px 0 0;
    font-weight: 400;
  }
  .verdict.ok {
    background: color-mix(in oklch, var(--income) 14%, transparent);
    color: var(--income);
  }
  .verdict.bad {
    background: color-mix(in oklch, var(--over) 12%, transparent);
    color: var(--over);
  }
  .verdict.warn {
    background: color-mix(in oklch, var(--warn) 18%, transparent);
  }
  .accounts {
    list-style: none;
    margin: 0 0 16px;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .format summary {
    cursor: pointer;
    font-weight: 650;
  }
  .format p {
    margin: 10px 0 0;
    max-width: 80ch;
    color: var(--ink-soft);
  }
  .format :global(.btn) {
    margin-top: 14px;
  }
  .tag {
    padding: 1px 9px;
    border-radius: 999px;
    background: color-mix(in oklch, var(--brand) 12%, transparent);
    color: var(--brand);
    font-size: var(--text-micro);
    font-weight: 650;
  }
  .tag.warn {
    background: color-mix(in oklch, var(--warn) 22%, transparent);
    color: var(--ink);
  }
  .rows {
    max-height: 420px;
    overflow-y: auto;
    border-top: 1px solid var(--line);
  }
  .row {
    display: grid;
    grid-template-columns: 100px minmax(0, 1fr) auto;
    gap: 14px;
    padding: 7px 4px;
    border-bottom: 1px solid var(--line);
  }
  .row.duplicate {
    opacity: 0.42;
  }
  .row.duplicate .desc {
    text-decoration: line-through;
  }
  .date {
    color: var(--ink-faint);
  }
  .desc {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .showing {
    margin: 8px 0 0;
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }
  .section-title {
    margin: 0 0 10px;
    font-size: var(--text-body);
    color: var(--ink-soft);
  }
  .history {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .history li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: 14px;
    padding: 10px 0;
    border-top: 1px solid var(--line);
  }
  .history li.rolled {
    opacity: 0.55;
  }
  .history strong {
    display: block;
    overflow-wrap: anywhere;
  }
  .meta {
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .quiet {
    color: var(--ink-soft);
  }
  .error {
    color: var(--over);
    font-weight: 600;
  }
</style>
