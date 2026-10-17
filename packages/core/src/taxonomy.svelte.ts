import { api } from './api';
import { categoryName } from './i18n.svelte';
import type { Account, Bank, BudgetGroup, Category } from './types';

const UNCATEGORIZED_COLOR = 'uncategorized';

/** Categories, budget groups and accounts: small, read everywhere, loaded once per session. */
class Taxonomy {
  categories = $state<Category[]>([]);
  groups = $state<BudgetGroup[]>([]);
  accounts = $state<Account[]>([]);
  banks = $state<Bank[]>([]);
  loaded = $state(false);

  byId = $derived(new Map(this.categories.map((c) => [c.id, c])));
  mains = $derived(this.categories.filter((c) => !c.parent_id));
  accountsById = $derived(new Map(this.accounts.map((a) => [a.id, a])));
  banksById = $derived(new Map(this.banks.map((b) => [b.id, b])));

  async load() {
    const [taxonomy, accounts, banks] = await Promise.all([
      api.get<{ categories: Category[]; budget_groups: BudgetGroup[] }>('/categories'),
      api.get<{ accounts: Account[] }>('/accounts'),
      api.get<{ banks: Bank[] }>('/banks'),
    ]);
    this.categories = taxonomy.categories;
    this.groups = taxonomy.budget_groups;
    this.accounts = accounts.accounts;
    this.banks = banks.banks;
    this.loaded = true;
  }

  async reloadCategories() {
    const taxonomy = await api.get<{ categories: Category[]; budget_groups: BudgetGroup[] }>('/categories');
    this.categories = taxonomy.categories;
    this.groups = taxonomy.budget_groups;
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

  /** The main category's name above a subcategory; empty for a main category. */
  parentLabel(id: string | undefined | null): string {
    const c = id ? this.byId.get(id) : undefined;
    const parent = c?.parent_id ? this.byId.get(c.parent_id) : undefined;
    return parent ? categoryName(parent) : '';
  }

  /** "Doprava › Pohonné hmoty" for a subcategory. */
  path(id: string): string {
    const c = this.byId.get(id);
    if (!c) return '';
    const parent = c.parent_id ? this.byId.get(c.parent_id) : undefined;
    return parent ? `${categoryName(parent)} › ${categoryName(c)}` : categoryName(c);
  }

  bankName(id: string | undefined | null): string {
    return id ? (this.banksById.get(id)?.short_name ?? '') : '';
  }

  /** The bank an account number belongs to; twin of coin-book-api/internal/domain/bank.CandidateID. */
  bankOfNumber(number: string | undefined | null): Bank | undefined {
    if (!number) return undefined;
    const compact = number.replace(/\s/g, '').toUpperCase();
    const iban = compact.match(/^(CZ|SK)\d{2}(\d{4})\d{16}$/);
    const czech = compact.match(/\/(\d{4})$/);
    const id = iban ? `${iban[1].toLowerCase()}-${iban[2]}` : czech ? `cz-${czech[1]}` : '';
    return this.banksById.get(id);
  }

  children(parentId: string): Category[] {
    return this.categories.filter((c) => c.parent_id === parentId);
  }
}

export const taxonomy = new Taxonomy();
