<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '@coin-book/core/api';
  import { errorText } from '@coin-book/core/errors';
  import { categoryName, pluralKey, t, type MessageKey } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import { toasts } from '@coin-book/core/toast';
  import type { Category, Rule } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import CategoryChip from '@coin-book/ui/CategoryChip.svelte';
  import CategoryIcon from '@coin-book/ui/CategoryIcon.svelte';
  import Icon from '@coin-book/ui/Icon.svelte';
  import CategoryForm from '$lib/CategoryForm.svelte';

  type Editing = { mode: 'new-main' } | { mode: 'edit'; id: string } | { mode: 'new-sub'; parentId: string };

  let rules = $state<Rule[]>([]);
  let editing = $state<Editing | null>(null);

  onMount(() => {
    void loadRules();
    void taxonomy.reloadCategories();
  });

  function close() {
    editing = null;
    void loadRules();
  }

  function isEditing(id: string) {
    return editing?.mode === 'edit' && editing.id === id;
  }

  function editsInside(main: Category) {
    if (!editing) return false;
    if (editing.mode === 'new-sub') return editing.parentId === main.id;
    if (editing.mode !== 'edit') return false;
    const id = editing.id;
    return id === main.id || taxonomy.children(main.id).some((c) => c.id === id);
  }

  function transactionsOf(main: Category) {
    return taxonomy
      .children(main.id)
      .reduce((sum, c) => sum + (c.usage?.transactions ?? 0), main.usage?.transactions ?? 0);
  }

  function txCount(n: number) {
    return t(`categories.tx.${pluralKey(n)}` as MessageKey, { count: n });
  }

  async function loadRules() {
    rules = (await api.get<{ rules: Rule[] }>('/rules')).rules;
  }

  async function remove(rule: Rule) {
    try {
      await api.delete(`/rules/${rule.id}`);
      rules = rules.filter((r) => r.id !== rule.id);
      toasts.show(t('categories.ruleDeleted'), 'success');
    } catch (e) {
      toasts.show(errorText(e), 'error');
    }
  }

  function conditions(rule: Rule): [string, string][] {
    const out: [string, string][] = [];
    if (rule.match_counterparty) out.push([t('categories.match.counterparty'), rule.match_counterparty]);
    if (rule.match_description) out.push([t('categories.match.description'), rule.match_description]);
    if (rule.match_counterparty_account)
      out.push([t('categories.match.counterparty_account'), rule.match_counterparty_account]);
    if (rule.match_operation_type)
      out.push([t('categories.match.operation_type'), rule.match_operation_type]);
    if (rule.match_variable_symbol)
      out.push([t('categories.match.variable_symbol'), rule.match_variable_symbol]);
    return out;
  }

  function groupName(id: string | undefined) {
    const g = taxonomy.groups.find((g) => g.id === id);
    return g ? categoryName(g) : t('categories.noGroup');
  }
</script>

<svelte:head><title>{t('categories.title')} · coin-book</title></svelte:head>

<header class="head">
  <h1 class="display title">{t('categories.title')}</h1>
  {#if editing?.mode !== 'new-main'}
    <Button icon="plus" onclick={() => (editing = { mode: 'new-main' })}>{t('categories.new')}</Button>
  {/if}
</header>

<div class="layout">
  <section class="grid">
    {#if editing?.mode === 'new-main'}
      <article class="cat wide" style="--c: var(--brand)" data-testid="new-category-card">
        <h2 class="form-title">{t('categories.new')}</h2>
        <CategoryForm onclose={close} />
      </article>
    {/if}
    {#each taxonomy.mains as main (main.id)}
      <article
        class="cat"
        class:wide={editsInside(main)}
        style="--c: var(--cat-{main.color_key})"
        data-testid="category-card"
        data-code={main.code}
      >
        {#if isEditing(main.id)}
          <CategoryForm category={main} onclose={close} />
        {:else}
          <header>
            <CategoryIcon
              colorKey={main.color_key ?? 'uncategorized'}
              icon={main.icon ?? 'question'}
              size={40}
            />
            <div class="heading">
              <h2>{categoryName(main)}</h2>
              <span class="meta"
                >{main.custom ? `${t('categories.custom')}, ` : ''}{t(
                  `categories.kind.${main.kind}`,
                )}{main.budget_group_id ? `, ${groupName(main.budget_group_id)}` : ''}</span
              >
              <a class="meta count" href="/transactions?category={main.id}">{txCount(transactionsOf(main))}</a
              >
            </div>
            <button
              type="button"
              class="icon-btn"
              aria-label="{t('categories.edit')} {categoryName(main)}"
              onclick={() => (editing = { mode: 'edit', id: main.id })}
            >
              <Icon name="pencil-simple" size={16} />
            </button>
          </header>
          <ul class="subs">
            {#each taxonomy.children(main.id) as sub (sub.id)}
              <li>
                {#if sub.custom}
                  <button
                    type="button"
                    class="sub custom"
                    class:active={isEditing(sub.id)}
                    onclick={() => (editing = { mode: 'edit', id: sub.id })}
                  >
                    {categoryName(sub)}
                    <span class="num">{sub.usage?.transactions ?? 0}</span>
                  </button>
                {:else}
                  <a class="sub" href="/transactions?category={sub.id}">
                    {categoryName(sub)}
                    <span class="num">{sub.usage?.transactions ?? 0}</span>
                  </a>
                {/if}
              </li>
            {/each}
            <li>
              <button
                type="button"
                class="sub add"
                class:active={editing?.mode === 'new-sub' && editing.parentId === main.id}
                onclick={() => (editing = { mode: 'new-sub', parentId: main.id })}
              >
                <Icon name="plus" size={12} weight="bold" />
                {t('categories.addSub')}
              </button>
            </li>
          </ul>
          {#if editing?.mode === 'new-sub' && editing.parentId === main.id}
            <div class="sub-form"><CategoryForm parentId={main.id} onclose={close} /></div>
          {:else if editing?.mode === 'edit' && taxonomy.byId.get(editing.id)?.parent_id === main.id}
            {#key editing.id}
              <div class="sub-form">
                <CategoryForm category={taxonomy.byId.get(editing.id)} onclose={close} />
              </div>
            {/key}
          {/if}
        {/if}
      </article>
    {/each}
  </section>

  <section class="rules">
    <h2 class="display">{t('categories.rules')}</h2>
    <p class="lead">{t('categories.rulesLead')}</p>
    {#if rules.length === 0}
      <p class="quiet">{t('categories.rulesEmpty')}</p>
    {:else}
      <ol>
        {#each rules as rule (rule.id)}
          <li>
            <div class="conditions">
              {#each conditions(rule) as [label, value] (label)}
                <span><span class="quiet">{label}</span> <strong>{value}</strong></span>
              {/each}
            </div>
            <CategoryChip
              colorKey={taxonomy.colorKey(rule.category_id)}
              label={taxonomy.path(rule.category_id)}
            />
            <button
              type="button"
              class="delete"
              aria-label={t('categories.deleteRule')}
              onclick={() => remove(rule)}
            >
              <Icon name="trash" size={16} />
            </button>
          </li>
        {/each}
      </ol>
    {/if}
  </section>
</div>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
  }
  .title {
    margin: 0;
    font-size: var(--text-headline);
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(300px, 1fr);
    gap: 22px;
    align-items: start;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 12px;
  }
  .cat {
    padding: 16px 18px;
    border-radius: var(--radius-panel);
    background: var(--surface);
    border-top: 4px solid var(--c);
  }
  .cat.wide {
    grid-column: 1 / -1;
  }
  .cat header {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }
  .heading {
    display: grid;
    flex: 1;
    min-width: 0;
  }
  .cat h2,
  .form-title {
    margin: 0;
    font-size: var(--text-body);
  }
  .form-title {
    margin-bottom: 14px;
  }
  .meta {
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .count {
    justify-self: start;
    text-decoration: none;
  }
  .count:hover {
    color: var(--ink);
    text-decoration: underline;
  }
  .icon-btn {
    align-self: start;
    border: 0;
    background: none;
    color: var(--ink-faint);
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
  }
  .icon-btn:hover {
    color: var(--ink);
    background: color-mix(in oklch, var(--ink) 6%, transparent);
  }
  .subs {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .sub {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in oklch, var(--c) 11%, transparent);
    color: var(--ink-soft);
    font: inherit;
    font-size: var(--text-micro);
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  }
  .sub.custom {
    box-shadow: inset 0 0 0 1.5px color-mix(in oklch, var(--c) 55%, transparent);
  }
  .sub .num {
    color: var(--ink-faint);
    font-weight: 500;
  }
  .sub:hover,
  .sub.active {
    background: color-mix(in oklch, var(--c) 24%, transparent);
    color: var(--ink);
  }
  .sub.add {
    background: transparent;
    box-shadow: inset 0 0 0 1.5px color-mix(in oklch, var(--c) 45%, transparent);
    color: var(--ink-faint);
  }
  .sub-form {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
  }
  .rules {
    position: sticky;
    top: 20px;
    padding: 20px 22px;
    border-radius: var(--radius-panel);
    background: var(--surface);
  }
  .rules h2 {
    margin: 0;
    font-size: var(--text-title);
  }
  .lead {
    margin: 4px 0 14px;
    color: var(--ink-soft);
    font-size: var(--text-micro);
  }
  .rules ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .rules li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 10px;
    align-items: center;
    padding: 10px 0;
    border-top: 1px solid var(--line);
  }
  .conditions {
    display: grid;
    gap: 2px;
    font-size: var(--text-micro);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .quiet {
    color: var(--ink-faint);
  }
  .delete {
    border: 0;
    background: none;
    color: var(--ink-faint);
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
  }
  .delete:hover {
    color: var(--over);
    background: color-mix(in oklch, var(--over) 10%, transparent);
  }
  @media (max-width: 1000px) {
    .layout {
      grid-template-columns: 1fr;
    }
    .rules {
      position: static;
    }
  }
</style>
