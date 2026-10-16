<script lang="ts">
  import { Command, Popover } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import { categoryName, t } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import CategoryIcon from './CategoryIcon.svelte';

  type Props = {
    open?: boolean;
    /** Offer "save as rule for …" with this value; null hides the option. */
    ruleValue?: string | null;
    onpick: (categoryId: string, saveRule: boolean) => void;
    trigger: Snippet<[Record<string, unknown>]>;
  };

  let { open = $bindable(false), ruleValue = null, onpick, trigger }: Props = $props();

  let saveRule = $state(true);

  function pick(id: string) {
    onpick(id, ruleValue !== null && saveRule);
    open = false;
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      {@render trigger(props)}
    {/snippet}
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content class="picker" sideOffset={6} align="start" collisionPadding={16}>
      <Command.Root loop>
        <Command.Input class="picker-input" placeholder={t('picker.placeholder')} />
        <Command.List class="picker-list">
          <Command.Viewport>
            <Command.Empty class="picker-empty">{t('picker.empty')}</Command.Empty>
            {#each taxonomy.mains as main (main.id)}
              <Command.Group value={main.id}>
                <Command.GroupItems>
                  <Command.Item
                    value={main.id}
                    keywords={[main.name_cs, main.name_sk, main.code]}
                    onSelect={() => pick(main.id)}
                    class="picker-item main"
                  >
                    <CategoryIcon
                      colorKey={main.color_key ?? 'uncategorized'}
                      icon={main.icon ?? 'question'}
                      size={26}
                    />
                    <span>{categoryName(main)}</span>
                  </Command.Item>
                  {#each taxonomy.children(main.id) as sub (sub.id)}
                    <Command.Item
                      value={sub.id}
                      keywords={[sub.name_cs, sub.name_sk, sub.code, main.name_cs, main.name_sk]}
                      onSelect={() => pick(sub.id)}
                      class="picker-item sub"
                    >
                      <span class="sub-dot" style="background: var(--cat-{main.color_key})"></span>
                      <span>{categoryName(sub)}</span>
                    </Command.Item>
                  {/each}
                </Command.GroupItems>
              </Command.Group>
            {/each}
          </Command.Viewport>
        </Command.List>
      </Command.Root>
      {#if ruleValue !== null}
        <label class="rule">
          <input type="checkbox" bind:checked={saveRule} />
          <span>{t('picker.saveRule', { value: ruleValue })}</span>
        </label>
      {/if}
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>

<style>
  :global(.picker) {
    z-index: 50;
    width: min(340px, calc(100vw - 32px));
    border-radius: var(--radius-panel);
    background: var(--surface-raised);
    box-shadow: var(--shadow-float);
    border: 1px solid var(--line);
    overflow: hidden;
  }
  :global(.picker-input) {
    width: 100%;
    box-sizing: border-box;
    padding: 14px 16px;
    border: 0;
    border-bottom: 1px solid var(--line);
    background: transparent;
    color: var(--ink);
    font: inherit;
    outline: none;
  }
  :global(.picker-list) {
    max-height: 340px;
    overflow-y: auto;
    padding: 6px;
  }
  :global(.picker-empty) {
    padding: 16px;
    color: var(--ink-soft);
  }
  :global(.picker-item) {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-radius: 10px;
    cursor: pointer;
    color: var(--ink);
  }
  :global(.picker-item.main) {
    font-weight: 650;
    margin-top: 2px;
  }
  :global(.picker-item.sub) {
    padding-left: 22px;
    color: var(--ink-soft);
  }
  :global(.picker-item[data-selected]) {
    background: color-mix(in oklch, var(--brand) 12%, transparent);
    color: var(--ink);
  }
  .sub-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    flex: none;
  }
  .rule {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 12px 16px;
    border-top: 1px solid var(--line);
    font-size: var(--text-micro);
    color: var(--ink-soft);
    cursor: pointer;
  }
  .rule input {
    accent-color: var(--brand);
    margin-top: 2px;
  }
</style>
