import { api } from '@coin-book/core/api';
import type { Triage } from '@coin-book/core/types';

/** The "K vyřešení" badge: uncategorised transactions waiting for the user. */
class Queue {
  remaining = $state(0);

  async refresh() {
    try {
      this.remaining = (await api.get<Triage>('/triage')).remaining;
    } catch {
      // The badge is a hint; a failed count must not break the page.
    }
  }
}

export const queue = new Queue();
