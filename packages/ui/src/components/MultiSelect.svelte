<script lang="ts">
  import Icon from './Icon.svelte';

  type Option = { value: string; label: string; checked: boolean };

  type Props = {
    label: string;
    /** Shown while no option is checked. */
    placeholder: string;
    options: Option[];
    ontoggle: (value: string, checked: boolean) => void;
  };

  let { label, placeholder, options, ontoggle }: Props = $props();

  let open = $state(false);
  let root = $state<HTMLElement>();
  let trigger = $state<HTMLButtonElement>();
  let menu = $state<HTMLElement>();
  let alignEnd = $state(false);

  const viewportGutter = 8;

  $effect(() => {
    if (!menu) {
      alignEnd = false;
      return;
    }
    alignEnd = menu.getBoundingClientRect().right > window.innerWidth - viewportGutter;
  });

  const summary = $derived(
    options
      .filter((o) => o.checked)
      .map((o) => o.label)
      .join(', ') || placeholder,
  );

  function onclick(e: MouseEvent) {
    if (open && !root?.contains(e.target as Node)) open = false;
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !open) return;
    open = false;
    trigger?.focus();
  }
</script>

<svelte:window {onclick} {onkeydown} />

<div class="multiselect" bind:this={root}>
  <button
    bind:this={trigger}
    type="button"
    class="trigger"
    class:active={options.some((o) => o.checked)}
    aria-haspopup="true"
    aria-expanded={open}
    aria-label="{label}: {summary}"
    onclick={() => (open = !open)}
  >
    <span class="summary">{summary}</span>
    <Icon name="caret-down" size={14} />
  </button>
  {#if open}
    <div bind:this={menu} class="menu" class:end={alignEnd} role="group" aria-label={label}>
      {#each options as o (o.value)}
        <label>
          <input
            type="checkbox"
            checked={o.checked}
            onchange={(e) => ontoggle(o.value, e.currentTarget.checked)}
          />
          {o.label}
        </label>
      {/each}
    </div>
  {/if}
</div>

<style>
  .multiselect {
    position: relative;
  }
  .trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 260px;
    padding: 9px 10px;
    border-radius: var(--radius-input);
    border: 1.5px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }
  .trigger.active {
    border-color: var(--brand);
  }
  .summary {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 50;
    display: grid;
    gap: 2px;
    min-width: 100%;
    padding: 6px;
    border-radius: var(--radius-input);
    background: var(--surface-raised);
    box-shadow: var(--shadow-float);
  }
  .menu.end {
    left: auto;
    right: 0;
  }
  label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    font-weight: 600;
    color: var(--ink-soft);
    white-space: nowrap;
    cursor: pointer;
  }
  label:hover {
    background: color-mix(in oklch, var(--ink) 6%, transparent);
  }
</style>
