<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '@coin-book/core/api';
  import { errorText } from '@coin-book/core/errors';
  import { categoryName, t } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import { toasts } from '@coin-book/core/toast';
  import type { Rule } from '@coin-book/core/types';
  import CategoryChip from '@coin-book/ui/CategoryChip.svelte';
  import CategoryIcon from '@coin-book/ui/CategoryIcon.svelte';
  import Icon from '@coin-book/ui/Icon.svelte';

  let rules = $state<Rule[]>([]);

  onMount(() => void loadRules());

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

<h1 class="display title">{t('categories.title')}</h1>

<div class="layout">
  <section class="grid">
    {#each taxonomy.mains as main (main.id)}
      <article class="cat" style="--c: var(--cat-{main.color_key})">
        <header>
          <CategoryIcon
            colorKey={main.color_key ?? 'uncategorized'}
            icon={main.icon ?? 'question'}
            size={40}
          />
          <div>
            <h2>{categoryName(main)}</h2>
            <span class="meta"
              >{t(`categories.kind.${main.kind}`)}{main.budget_group_id
                ? `, ${groupName(main.budget_group_id)}`
                : ''}</span
            >
          </div>
        </header>
        <ul>
          {#each taxonomy.children(main.id) as sub (sub.id)}
            <li><a href="/transakce?kategorie={sub.id}">{categoryName(sub)}</a></li>
          {/each}
        </ul>
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
  .title {
    margin: 0 0 20px;
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
  .cat header {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 10px;
  }
  .cat h2 {
    margin: 0;
    font-size: var(--text-body);
  }
  .meta {
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .cat ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
  }
  .cat a {
    font-size: var(--text-micro);
    color: var(--ink-soft);
    text-decoration: none;
  }
  .cat a:hover {
    color: var(--ink);
    text-decoration: underline;
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
