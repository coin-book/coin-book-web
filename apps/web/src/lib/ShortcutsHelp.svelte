<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { t } from '@coin-book/core/i18n';

  let { open = $bindable(false) } = $props();

  const rows = $derived([
    ['⌘K', t('shortcuts.palette')],
    ['/', t('shortcuts.search')],
    ['J / K', t('shortcuts.rows')],
    ['C', t('shortcuts.category')],
    ['?', t('shortcuts.help')],
  ]);
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="palette-overlay" />
    <Dialog.Content class="shortcuts">
      <Dialog.Title class="display shortcuts-title">{t('shortcuts.title')}</Dialog.Title>
      <dl>
        {#each rows as [key, label] (key)}
          <dt><kbd>{key}</kbd></dt>
          <dd>{label}</dd>
        {/each}
      </dl>
      <Dialog.Close class="shortcuts-close">{t('common.close')}</Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.shortcuts) {
    position: fixed;
    z-index: 61;
    top: 18vh;
    left: 50%;
    transform: translateX(-50%);
    width: min(420px, calc(100vw - 32px));
    padding: 24px;
    border-radius: 18px;
    background: var(--surface-raised);
    box-shadow: var(--shadow-float);
  }
  :global(.shortcuts-title) {
    margin: 0 0 14px;
    font-size: var(--text-title);
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px 16px;
    margin: 0 0 18px;
  }
  dd {
    margin: 0;
  }
  kbd {
    display: inline-block;
    min-width: 28px;
    padding: 2px 8px;
    border-radius: 7px;
    border: 1px solid var(--line);
    background: var(--canvas);
    font: inherit;
    font-weight: 700;
    text-align: center;
  }
  :global(.shortcuts-close) {
    border: 0;
    padding: 8px 14px;
    border-radius: var(--radius-input);
    background: color-mix(in oklch, var(--brand) 11%, transparent);
    color: var(--brand);
    font: inherit;
    font-weight: 650;
    cursor: pointer;
  }
</style>
