import { api } from './api';
import { categoryName } from './i18n.svelte';
import type { Account, BudgetGroup, Category } from './types';

const UNCATEGORIZED_COLOR = 'uncategorized';

/** Categories, budget groups and accounts: small, read everywhere, loaded once per session. */
class Taxonomy {
  categories = $state<Category[]>([]);
  groups = $state<BudgetGroup[]>([]);
  accounts = $state<Account[]>([]);
  loaded = $state(false);

  byId = $derived(new Map(this.categories.map((c) => [c.id, c])));
  mains = $derived(this.categories.filter((c) => !c.parent_id));
  accountsById = $derived(new Map(this.accounts.map((a) => [a.id, a])));

  async load() {
    const [taxonomy, accounts] = await Promise.all([
      api.get<{ categories: Category[]; budget_groups: BudgetGroup[] }>('/categories'),
      api.get<{ accounts: Account[] }>('/accounts'),
    ]);
    this.categories = taxonomy.categories;
    this.groups = taxonomy.budget_groups;
    this.accounts = accounts.accounts;
    this.loaded = true;
  }

  async reloadAccounts() {
    this.accounts = (await api.get<{ accounts: Account[] }>('/accounts')).accounts;
  }

  main(id: string | undefined | null): Category | undefined {
    if (!id) return undefined;
    const c = this.byId.get(id);
    if (!c?.parent_id) return c;
    return this.byId.get(c.parent_id);
  }

  /** A subcategory has no colour of its own; it wears its parent's. */
  colorKey(id: string | undefined | null): string {
    return this.main(id)?.color_key ?? UNCATEGORIZED_COLOR;
  }

  icon(id: string | undefined | null): string {
    return this.main(id)?.icon ?? 'question';
  }

  label(id: string | undefined | null): string {
    const c = id ? this.byId.get(id) : undefined;
    return c ? categoryName(c) : '';
  }

  /** "Doprava › Pohonné hmoty" for a subcategory. */
  path(id: string): string {
    const c = this.byId.get(id);
    if (!c) return '';
    const parent = c.parent_id ? this.byId.get(c.parent_id) : undefined;
    return parent ? `${categoryName(parent)} › ${categoryName(c)}` : categoryName(c);
  }

  children(parentId: string): Category[] {
    return this.categories.filter((c) => c.parent_id === parentId);
  }
}

export const taxonomy = new Taxonomy();
