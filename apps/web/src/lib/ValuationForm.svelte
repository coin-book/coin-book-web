<script lang="ts">
  import { api } from '@coin-book/core/api';
  import { todayISO } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { t } from '@coin-book/core/i18n';
  import { parseMinor } from '@coin-book/core/money';
  import { toasts } from '@coin-book/core/toast';
  import Button from '@coin-book/ui/Button.svelte';

  type Props = {
    accountId: string;
    currency: string;
    /** A loan: the value is the balance owed, which corrects the schedule. */
    loan?: boolean;
    onsaved: () => void;
  };

  let { accountId, currency, loan = false, onsaved }: Props = $props();

  let valuedOn = $state(todayISO());
  let value = $state('');
  let note = $state('');
  let busy = $state(false);

  async function save(e: SubmitEvent) {
    e.preventDefault();
    const minor = parseMinor(value, currency);
    if (minor === null || minor < 0) {
      toasts.show(t('accounts.openingHint'), 'error');
      return;
    }
    busy = true;
    try {
      await api.post(`/accounts/${accountId}/valuations`, {
        valued_on: valuedOn,
        value_minor: minor,
        note: note.trim() || undefined,
      });
      toasts.show(t('valuation.saved'), 'success');
      value = note = '';
      onsaved();
    } catch (err) {
      toasts.show(errorText(err), 'error');
    } finally {
      busy = false;
    }
  }
</script>

<form class="valuation" onsubmit={save} data-testid="valuation-form">
  {#if loan}<p class="hint">{t('valuation.loanLead')}</p>{/if}
  <label class="field">
    <span>{t('valuation.date')}</span>
    <input type="date" bind:value={valuedOn} required max={todayISO()} />
  </label>
  <label class="field">
    <span>{loan ? t('valuation.loanTitle') : t('valuation.value')} ({currency})</span>
    <input bind:value inputmode="decimal" required placeholder="0" />
  </label>
  <label class="field grow">
    <span>{t('valuation.note')}</span>
    <input bind:value={note} maxlength="200" />
  </label>
  <Button type="submit" {busy}>{t('valuation.save')}</Button>
</form>

<style>
  .valuation {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 10px 14px;
    padding: 12px 0 4px;
  }
  .hint {
    flex-basis: 100%;
    margin: 0;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .field {
    display: grid;
    gap: 4px;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .field.grow {
    flex: 1;
    min-width: 160px;
  }
  input {
    font: inherit;
    padding: 7px 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--surface);
    color: var(--ink);
  }
</style>
