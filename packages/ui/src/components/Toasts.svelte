<script lang="ts">
  import { colorVar } from '@coin-book/core/colors';
  import { toasts } from '@coin-book/core/toast';
  import { t } from '@coin-book/core/i18n';
  import Icon from './Icon.svelte';
</script>

<div class="toasts" aria-live="polite">
  {#each toasts.items as toast (toast.id)}
    <div class="toast {toast.tone}" style="--c: {toast.colorKey ? colorVar(toast.colorKey) : 'var(--brand)'}">
      <span class="bar"></span>
      <span class="message">{toast.message}</span>
      {#if toast.action}
        <button
          type="button"
          class="action"
          onclick={async () => {
            toasts.dismiss(toast.id);
            await toast.action?.run();
          }}>{toast.action.label}</button
        >
      {/if}
      <button type="button" aria-label={t('common.close')} onclick={() => toasts.dismiss(toast.id)}>
        <Icon name="x" size={14} weight="bold" />
      </button>
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 80;
    display: grid;
    gap: 8px;
    width: min(380px, calc(100vw - 32px));
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px 12px 0;
    border-radius: 14px;
    background: var(--surface-raised);
    box-shadow: var(--shadow-float);
    border: 1px solid var(--line);
    animation: in 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .toast.error {
    --c: var(--over) !important;
  }
  .bar {
    align-self: stretch;
    width: 5px;
    border-radius: 0 4px 4px 0;
    background: var(--c);
  }
  .message {
    flex: 1;
    font-weight: 550;
  }
  button {
    border: 0;
    background: transparent;
    color: var(--ink-faint);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
  }
  .action {
    flex: none;
    padding: 6px 10px;
    border-radius: 8px;
    background: color-mix(in oklch, var(--brand) 14%, transparent);
    color: var(--brand);
    font: inherit;
    font-weight: 650;
  }
  @keyframes in {
    from {
      transform: translateY(8px);
      opacity: 0;
    }
  }
</style>
