<script lang="ts" module>
  export type PaletteEntry = { id: string; label: string; icon: string; href: string; keywords?: string[] };
</script>

<script lang="ts">
  import { Command, Dialog } from 'bits-ui';
  import { goto } from '$app/navigation';
  import { t } from '@coin-book/core/i18n';
  import Icon from './Icon.svelte';

  type Props = { open?: boolean; destinations: PaletteEntry[]; actions: PaletteEntry[] };

  let { open = $bindable(false), destinations, actions }: Props = $props();

  let query = $state('');

  function go(href: string) {
    open = false;
    query = '';
    goto(href);
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="palette-overlay" />
    <Dialog.Content class="palette" aria-label={t('palette.placeholder')}>
      <Command.Root loop>
        <div class="palette-search">
          <Icon name="magnifying-glass" size={20} />
          <Command.Input bind:value={query} class="palette-input" placeholder={t('palette.placeholder')} />
        </div>
        <Command.List class="palette-list">
          <Command.Viewport>
            <Command.Group value="go">
              <Command.GroupHeading class="palette-heading">{t('palette.go')}</Command.GroupHeading>
              <Command.GroupItems>
                {#each destinations as d (d.id)}
                  <Command.Item
                    value={d.id}
                    keywords={[d.label, ...(d.keywords ?? [])]}
                    class="palette-item"
                    onSelect={() => go(d.href)}
                  >
                    <Icon name={d.icon} />
                    <span>{d.label}</span>
                  </Command.Item>
                {/each}
              </Command.GroupItems>
            </Command.Group>
            <Command.Group value="actions">
              <Command.GroupHeading class="palette-heading">{t('palette.actions')}</Command.GroupHeading>
              <Command.GroupItems>
                {#each actions as a (a.id)}
                  <Command.Item
                    value={a.id}
                    keywords={[a.label, ...(a.keywords ?? [])]}
                    class="palette-item"
                    onSelect={() => go(a.href)}
                  >
                    <Icon name={a.icon} />
                    <span>{a.label}</span>
                  </Command.Item>
                {/each}
              </Command.GroupItems>
            </Command.Group>
            {#if query.trim().length > 1}
              <Command.Group value="search">
                <Command.GroupItems>
                  <Command.Item
                    value="search-transactions"
                    keywords={[query]}
                    class="palette-item"
                    onSelect={() => go(`/transakce?q=${encodeURIComponent(query.trim())}`)}
                  >
                    <Icon name="list-bullets" />
                    <span>{t('palette.searchTransactions', { query: query.trim() })}</span>
                  </Command.Item>
                </Command.GroupItems>
              </Command.Group>
            {/if}
          </Command.Viewport>
        </Command.List>
      </Command.Root>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.palette-overlay) {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: color-mix(in oklch, var(--canvas) 55%, transparent);
    backdrop-filter: blur(3px);
  }
  :global(.palette) {
    position: fixed;
    z-index: 61;
    top: 14vh;
    left: 50%;
    transform: translateX(-50%);
    width: min(560px, calc(100vw - 32px));
    border-radius: 18px;
    background: var(--surface-raised);
    border: 1px solid var(--line);
    box-shadow: var(--shadow-float);
    overflow: hidden;
  }
  .palette-search {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 18px;
    border-bottom: 1px solid var(--line);
    color: var(--ink-faint);
  }
  :global(.palette-input) {
    flex: 1;
    padding: 18px 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: var(--text-lead);
    outline: none;
  }
  :global(.palette-list) {
    max-height: 50vh;
    overflow-y: auto;
    padding: 8px;
  }
  :global(.palette-heading) {
    padding: 10px 12px 4px;
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  :global(.palette-item) {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
  }
  :global(.palette-item[data-selected]) {
    background: color-mix(in oklch, var(--brand) 12%, transparent);
  }
</style>
