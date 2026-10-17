<script lang="ts">
  import { page } from '$app/state';
  import { api } from '@coin-book/core/api';
  import { errorText } from '@coin-book/core/errors';
  import { categoryName, t } from '@coin-book/core/i18n';
  import { formatWhole, parseMinor } from '@coin-book/core/money';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import { toasts } from '@coin-book/core/toast';
  import type { BudgetMonth } from '@coin-book/core/types';
  import BudgetBullets, { type BudgetBullet } from '@coin-book/ui/BudgetBullets.svelte';
  import Button from '@coin-book/ui/Button.svelte';
  import CategoryIcon from '@coin-book/ui/CategoryIcon.svelte';
  import EmptyState from '@coin-book/ui/EmptyState.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import MonthSwitcher from '@coin-book/ui/MonthSwitcher.svelte';

  const CURRENCY = 'CZK';

  const month = $derived(page.params.mesic ?? '');

  let budget = $state<BudgetMonth | null>(null);
  let error = $state('');
  let editing = $state(false);
  let draft = $state<Record<string, string>>({});
  let saving = $state(false);

  $effect(() => {
    const m = month;
    editing = false;
    void load(m);
  });

  async function load(m: string) {
    error = '';
    try {
      budget = await api.get<BudgetMonth>(`/budgets/${m}`, { currency: CURRENCY });
    } catch (e) {
      error = errorText(e);
    }
  }

  const plannable = $derived(taxonomy.mains.filter((c) => c.kind === 'expense' || c.kind === 'financial'));
  const pace = $derived(budget && budget.elapsed > 0 && budget.elapsed < 1 ? budget.elapsed : null);
  const bullets = $derived<BudgetBullet[]>(
    (budget?.lines ?? []).map((line) => ({
      key: line.category_id ?? line.budget_group_id ?? '',
      label: line.category_id ? taxonomy.label(line.category_id) : '',
      colorKey: taxonomy.colorKey(line.category_id),
      plannedMinor: line.planned_minor,
      spentMinor: line.spent_minor,
      status: line.status,
      href: line.category_id ? `/transakce?kategorie=${line.category_id}&od=${month}-01` : undefined,
    })),
  );

  function startEditing() {
    draft = Object.fromEntries(
      plannable.map((c) => {
        const line = budget?.lines.find((l) => l.category_id === c.id);
        return [c.id, line ? String(Math.round(line.planned_minor / 100)) : ''];
      }),
    );
    editing = true;
  }

  function addUnbudgeted(categoryId: string, spentMinor: number) {
    if (!editing) startEditing();
    draft[categoryId] = String(Math.ceil(spentMinor / 100 / 100) * 100);
  }

  async function save() {
    const lines = [];
    for (const [categoryId, raw] of Object.entries(draft)) {
      if (!raw.trim()) continue;
      const minor = parseMinor(raw, CURRENCY);
      if (minor === null || minor < 0) {
        toasts.show(t('budget.emptyLead'), 'error');
        return;
      }
      if (minor > 0) lines.push({ category_id: categoryId, planned_minor: minor });
    }
    saving = true;
    try {
      budget = await api.put<BudgetMonth>(`/budgets/${month}?currency=${CURRENCY}`, { lines });
      editing = false;
      toasts.show(t('budget.saved'), 'success');
    } catch (e) {
      toasts.show(errorText(e), 'error');
    } finally {
      saving = false;
    }
  }

  async function copyPrevious() {
    try {
      const res = await api.post<{ copied: number }>(`/budgets/${month}/copy-previous?currency=${CURRENCY}`);
      if (res.copied === 0) toasts.show(t('budget.nothingToCopy'));
      else toasts.show(t('budget.copied', { count: res.copied }), 'success');
      await load(month);
    } catch (e) {
      toasts.show(errorText(e), 'error');
    }
  }
</script>

<svelte:head><title>{t('budget.title')} · coin-book</title></svelte:head>

<header class="head">
  <MonthSwitcher {month} hrefFor={(m) => `/rozpocet/${m}`} />
  {#if budget && !editing}
    <div class="head-actions">
      {#if budget.lines.length === 0}
        <Button variant="quiet" onclick={copyPrevious}>{t('budget.copyPrevious')}</Button>
      {/if}
      <Button icon="target" onclick={startEditing}>{t('budget.edit')}</Button>
    </div>
  {/if}
</header>

{#if error}
  <p class="error" role="alert">{error}</p>
{:else if budget}
  {#if editing}
    <section class="panel">
      <form
        class="plan"
        onsubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {#each plannable as c (c.id)}
          <label class="plan-row">
            <CategoryIcon colorKey={c.color_key ?? 'uncategorized'} icon={c.icon ?? 'question'} size={30} />
            <span class="name">{categoryName(c)}</span>
            <span class="input">
              <input
                inputmode="decimal"
                bind:value={draft[c.id]}
                placeholder="0"
                aria-label={categoryName(c)}
              />
              <span>Kč</span>
            </span>
          </label>
        {/each}
        <div class="plan-actions">
          <Button variant="ghost" type="button" onclick={() => (editing = false)}>{t('budget.cancel')}</Button
          >
          <Button type="submit" busy={saving}>{t('budget.save')}</Button>
        </div>
      </form>
    </section>
  {:else if budget.lines.length === 0}
    <EmptyState icon="target" title={t('budget.emptyTitle')} lead={t('budget.emptyLead')}>
      <Button onclick={startEditing}>{t('budget.edit')}</Button>
    </EmptyState>
  {:else}
    <section class="summary">
      <div>
        <span class="label">{t('budget.planned')}</span>
        <MoneyAmount amount={{ minor: budget.planned_minor, currency: CURRENCY }} size="lg" whole />
      </div>
      <div>
        <span class="label">{t('budget.spent')}</span>
        <MoneyAmount amount={{ minor: budget.spent_minor, currency: CURRENCY }} size="lg" whole />
      </div>
      <div class="remaining" class:over={budget.remaining_minor < 0}>
        <span class="label">{t('overview.leftToSpend')}</span>
        <MoneyAmount amount={{ minor: budget.remaining_minor, currency: CURRENCY }} size="lg" whole />
      </div>
    </section>

    <section class="panel tubes">
      <BudgetBullets lines={bullets} currency={CURRENCY} label={t('budget.title')} elapsed={pace} />
      {#if pace !== null}
        <p class="legend"><span class="marker"></span>{t('budget.today')}</p>
      {/if}
    </section>
  {/if}

  {#if budget.unbudgeted.length > 0}
    <section class="panel">
      <h2>{t('budget.unbudgeted')}</h2>
      <ul class="unbudgeted">
        {#each budget.unbudgeted as u (u.category_id)}
          <li>
            <CategoryIcon
              colorKey={taxonomy.colorKey(u.category_id)}
              icon={taxonomy.icon(u.category_id)}
              size={28}
            />
            <span class="name">{taxonomy.label(u.category_id)}</span>
            <span class="num">{formatWhole(u.spent_minor, CURRENCY)}</span>
            <Button variant="ghost" onclick={() => addUnbudgeted(u.category_id, u.spent_minor)}
              >{t('budget.addToPlan')}</Button
            >
          </li>
        {/each}
      </ul>
    </section>
  {/if}
{/if}

<style>
  .head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    margin-bottom: 24px;
  }
  .head-actions {
    display: flex;
    gap: 10px;
  }
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: clamp(20px, 5vw, 56px);
    margin-bottom: 20px;
  }
  .summary .label {
    display: block;
    font-size: var(--text-micro);
    color: var(--ink-faint);
    margin-bottom: 4px;
  }
  .remaining {
    color: var(--income);
  }
  .remaining.over {
    color: var(--over);
  }
  .panel {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 18px 24px;
    margin-bottom: 18px;
  }
  .panel h2 {
    margin: 4px 0 8px;
    font-size: var(--text-body);
    color: var(--ink-soft);
  }
  .tubes {
    padding-block: 10px;
  }
  .legend {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 6px 0 4px;
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .marker {
    width: 3px;
    height: 14px;
    border-radius: 2px;
    background: var(--ink);
  }
  .plan {
    display: grid;
    gap: 4px;
  }
  .plan-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
  }
  .name {
    font-weight: 600;
  }
  .input {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--ink-faint);
  }
  .input input {
    width: 120px;
    padding: 8px 10px;
    border-radius: var(--radius-input);
    border: 1.5px solid var(--line);
    background: var(--canvas);
    color: var(--ink);
    font: inherit;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .input input:focus {
    border-color: var(--brand);
    outline: none;
  }
  .plan-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 14px;
  }
  .unbudgeted {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .unbudgeted li {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
  }
  .error {
    color: var(--over);
    font-weight: 600;
  }
</style>
