import { api } from '@coin-book/core/api';
import { errorText } from '@coin-book/core/errors';
import { t } from '@coin-book/core/i18n';
import { taxonomy } from '@coin-book/core/taxonomy';
import { toasts } from '@coin-book/core/toast';
import type { Transaction } from '@coin-book/core/types';
import { queue } from './queue.svelte';

type SuggestedRule = { counterparty: string; category_id: string; times: number };
type Result = { transaction: Transaction; applied_to_other: number; suggested_rule?: SuggestedRule };

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
    const category = taxonomy.path(categoryId);
    toasts.show(
      result.applied_to_other > 0
        ? t('categorizedWithRule', { category, count: result.applied_to_other })
        : t('categorized', { category }),
      'success',
      taxonomy.colorKey(categoryId),
    );
    if (result.suggested_rule) offerRule(result.suggested_rule);
    void queue.refresh();
    return result.transaction;
  } catch (e) {
    toasts.show(errorText(e), 'error');
    return null;
  }
}

function offerRule(rule: SuggestedRule) {
  toasts.show(
    t('learn.ruleOffer', {
      counterparty: rule.counterparty,
      times: rule.times,
      category: taxonomy.path(rule.category_id),
    }),
    'info',
    taxonomy.colorKey(rule.category_id),
    {
      label: t('learn.ruleCreate'),
      run: async () => {
        try {
          await api.post('/rules', { category_id: rule.category_id, match_counterparty: rule.counterparty });
          toasts.show(t('learn.ruleCreated'), 'success');
        } catch (e) {
          toasts.show(errorText(e), 'error');
        }
      },
    },
  );
}

/** Accepts the category the classifier chose. */
export async function confirmAutomatic(tx: Transaction): Promise<Transaction | null> {
  try {
    await api.post(`/transactions/${tx.id}/confirm`);
    toasts.show(t('learn.confirmed'), 'success', taxonomy.colorKey(tx.categories[0]?.category_id));
    return await api.get<Transaction>(`/transactions/${tx.id}`);
  } catch (e) {
    toasts.show(errorText(e), 'error');
    return null;
  }
}
