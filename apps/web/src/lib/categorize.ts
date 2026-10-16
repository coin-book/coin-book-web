import { api } from '@coin-book/core/api';
import { errorText } from '@coin-book/core/errors';
import { t } from '@coin-book/core/i18n';
import { taxonomy } from '@coin-book/core/taxonomy';
import { toasts } from '@coin-book/core/toast';
import type { Transaction } from '@coin-book/core/types';
import { queue } from './queue.svelte';

type Result = { transaction: Transaction; applied_to_other: number };

/** Puts a whole transaction into one category, optionally saving a rule for its counterparty. */
export async function categorize(
  tx: Transaction,
  categoryId: string,
  saveRule: boolean,
): Promise<Transaction | null> {
  try {
    const result = await api.put<Result>(`/transactions/${tx.id}/categories`, {
      lines: [{ category_id: categoryId, amount_minor: tx.amount.minor }],
      save_rule: saveRule && tx.counterparty ? 'counterparty' : undefined,
    });
    const category = taxonomy.label(categoryId);
    toasts.show(
      result.applied_to_other > 0
        ? t('categorizedWithRule', { category, count: result.applied_to_other })
        : t('categorized', { category }),
      'success',
      taxonomy.colorKey(categoryId),
    );
    void queue.refresh();
    return result.transaction;
  } catch (e) {
    toasts.show(errorText(e), 'error');
    return null;
  }
}
