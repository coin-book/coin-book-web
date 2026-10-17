<script lang="ts">
  import { untrack } from 'svelte';
  import { api, ApiError } from '@coin-book/core/api';
  import { errorText } from '@coin-book/core/errors';
  import { categoryName, pluralKey, t, type MessageKey } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import { toasts } from '@coin-book/core/toast';
  import type { Category } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import CategoryAppearance from '@coin-book/ui/CategoryAppearance.svelte';
  import CategoryIcon from '@coin-book/ui/CategoryIcon.svelte';

  type Props = {
    /** The category being edited; absent when creating one. */
    category?: Category;
    /** Creates a subcategory of this main category. */
    parentId?: string;
    onclose: () => void;
  };

  let { category, parentId, onclose }: Props = $props();

  const kinds = ['expense', 'income', 'financial', 'transfer'] as const;
  type Kind = (typeof kinds)[number];

  const isSub = $derived(!!(category?.parent_id ?? parentId));
  const system = $derived(!!category && !category.custom);
  const children = $derived(category && !category.parent_id ? taxonomy.children(category.id) : []);

  // The form edits a copy; the parent re-keys it to start over with another category.
  const initial = untrack(() => ({ category, parentId }));
  let name = $state(initial.category ? categoryName(initial.category) : '');
  let kind = $state<Kind>((initial.category?.kind as Kind | undefined) ?? 'expense');
  let groupId = $state(
    initial.category?.budget_group_id ?? taxonomy.groups.find((g) => g.code === 'flexible')?.id ?? '',
  );
  let colorKey = $state(initial.category?.color_key ?? 'chrpa');
  let icon = $state(initial.category?.icon ?? 'tag');
  let parent = $state(initial.category?.parent_id ?? initial.parentId ?? '');
  let busy = $state(false);

  let merging = $state(false);
  let mergeInto = $state('');

  function count(base: 'categories.tx' | 'categories.rule', n: number) {
    return t(`${base}.${pluralKey(n)}` as MessageKey, { count: n });
  }

  const usage = $derived.by(() => {
    const own = category?.usage ?? { transactions: 0, rules: 0 };
    return children.reduce(
      (sum, c) => ({
        transactions: sum.transactions + (c.usage?.transactions ?? 0),
        rules: sum.rules + (c.usage?.rules ?? 0),
      }),
      own,
    );
  });

  const mergeTargets = $derived(
    taxonomy.mains
      .filter((m) => m.id !== category?.id)
      .map((m) => ({ main: m, subs: taxonomy.children(m.id).filter((s) => s.id !== category?.id) })),
  );

  function body() {
    if (system) return { color_key: colorKey, icon, budget_group_id: groupId || undefined };
    const names = { name: name.trim() };
    if (isSub) return category ? { ...names, parent_id: parent } : { ...names, parent_id: parentId };
    return {
      ...names,
      kind,
      color_key: colorKey,
      icon,
      budget_group_id: groupId || undefined,
    };
  }

  async function save(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    try {
      if (category) await api.patch(`/categories/${category.id}`, body());
      else await api.post('/categories', body());
      await taxonomy.reloadCategories();
      toasts.show(t(category ? 'categories.saved' : 'categories.created'), 'success');
      onclose();
    } catch (err) {
      toasts.show(errorText(err), 'error');
    } finally {
      busy = false;
    }
  }

  async function remove() {
    if (!category) return;
    const unused = usage.transactions + usage.rules === 0 && children.length === 0;
    if (!unused) {
      merging = true;
      return;
    }
    if (!confirm(t('categories.deleteConfirm', { name: categoryName(category) }))) return;
    try {
      await api.delete(`/categories/${category.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'category_in_use') {
        merging = true;
        return;
      }
      toasts.show(errorText(err), 'error');
      return;
    }
    await taxonomy.reloadCategories();
    toasts.show(t('categories.deleted'), 'success');
    onclose();
  }

  async function mergeAndDelete() {
    if (!category || !mergeInto) return;
    busy = true;
    try {
      await api.delete(`/categories/${category.id}?merge_into=${mergeInto}`);
      await taxonomy.reloadCategories();
      toasts.show(
        t('categories.merged', { name: categoryName(category), target: taxonomy.path(mergeInto) }),
        'success',
      );
      onclose();
    } catch (err) {
      toasts.show(errorText(err), 'error');
    } finally {
      busy = false;
    }
  }
</script>

<form class="form" onsubmit={save} data-testid="category-form">
  {#if !isSub}
    <div class="preview">
      <CategoryIcon {colorKey} {icon} size={40} />
      <div class="preview-text">
        <strong>{name || t('categories.new')}</strong>
        {#if system}<small>{t('categories.systemHint')}</small>{/if}
      </div>
    </div>
  {/if}
  {#if !system}
    <label class="field">
      <span>{isSub && !category ? t('categories.subName') : t('categories.name')}</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input bind:value={name} required maxlength="80" autofocus />
    </label>
  {/if}

  {#if isSub && category}
    <label class="field">
      <span>{t('categories.parent')}</span>
      <select bind:value={parent}>
        {#each taxonomy.mains as m (m.id)}<option value={m.id}>{categoryName(m)}</option>{/each}
      </select>
    </label>
  {:else if !isSub}
    <div class="names">
      {#if !system}
        <label class="field">
          <span>{t('categories.kind')}</span>
          <select bind:value={kind}>
            {#each kinds as k (k)}<option value={k}>{t(`categories.kind.${k}`)}</option>{/each}
          </select>
        </label>
      {/if}
      <label class="field">
        <span>{t('categories.group')}</span>
        <select bind:value={groupId}>
          {#if !category?.budget_group_id}<option value="">{t('categories.noGroup')}</option>{/if}
          {#each taxonomy.groups as g (g.id)}<option value={g.id}>{categoryName(g)}</option>{/each}
        </select>
      </label>
    </div>
    <CategoryAppearance bind:colorKey bind:icon />
  {/if}

  {#if merging && category}
    <div class="merge">
      <p>
        {t('categories.inUse', {
          name: categoryName(category),
          transactions: count('categories.tx', usage.transactions),
          rules: count('categories.rule', usage.rules),
        })}
        {#if children.length}{t('categories.inUseSubs')}{/if}
      </p>
      <label class="field">
        <span>{t('categories.mergeInto')}</span>
        <select bind:value={mergeInto} required>
          <option value="" disabled></option>
          {#each mergeTargets as { main, subs } (main.id)}
            <optgroup label={categoryName(main)}>
              <option value={main.id}>{categoryName(main)}</option>
              {#if !children.length}
                {#each subs as s (s.id)}<option value={s.id}>{categoryName(s)}</option>{/each}
              {/if}
            </optgroup>
          {/each}
        </select>
      </label>
      <div class="actions">
        <Button variant="ghost" type="button" onclick={() => (merging = false)}>{t('common.cancel')}</Button>
        <Button
          variant="danger"
          type="button"
          icon="git-merge"
          {busy}
          disabled={!mergeInto}
          onclick={mergeAndDelete}
        >
          {t('categories.mergeAndDelete')}
        </Button>
      </div>
    </div>
  {:else}
    <div class="actions">
      {#if category?.custom}
        <Button variant="ghost" type="button" icon="trash" class="delete" onclick={remove}>
          {t('common.delete')}
        </Button>
      {/if}
      <span class="spacer"></span>
      <Button variant="ghost" type="button" onclick={onclose}>{t('common.cancel')}</Button>
      <Button type="submit" {busy}>{category ? t('common.save') : t('categories.create')}</Button>
    </div>
  {/if}
</form>

<style>
  .form {
    display: grid;
    gap: 14px;
  }
  .preview {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: var(--text-body);
  }
  .preview-text {
    display: grid;
  }
  .preview-text small {
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .names {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }
  .field {
    display: grid;
    align-content: start;
    gap: 4px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-soft);
    min-width: 0;
  }
  .field input,
  .field select {
    padding: 8px 10px;
    border-radius: var(--radius-input);
    border: 1.5px solid var(--line);
    background: var(--canvas);
    color: var(--ink);
    font: inherit;
    font-size: var(--text-body);
    font-weight: 500;
    min-width: 0;
  }
  .field input:focus,
  .field select:focus {
    border-color: var(--brand);
    outline: none;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .spacer {
    flex: 1;
  }
  .actions :global(.delete) {
    color: var(--over);
  }
  .merge {
    display: grid;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 12px;
    background: color-mix(in oklch, var(--over) 8%, transparent);
  }
  .merge p {
    margin: 0;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .merge .actions {
    justify-content: flex-end;
  }
</style>
