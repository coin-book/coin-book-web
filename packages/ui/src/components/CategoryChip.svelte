<script lang="ts">
  import { colorVar } from '@coin-book/core/colors';
  import type { Snippet } from 'svelte';

  type Props = {
    colorKey: string;
    label: string;
    muted?: boolean;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  };

  let { colorKey, label, muted = false, onclick, children }: Props = $props();
</script>

{#if onclick}
  <button type="button" class="chip" class:muted style="--c: {colorVar(colorKey)}" {onclick}>
    <span class="dot"></span><span class="label">{label}</span>{@render children?.()}
  </button>
{:else}
  <span class="chip" class:muted style="--c: {colorVar(colorKey)}">
    <span class="dot"></span><span class="label">{label}</span>{@render children?.()}
  </span>
{/if}

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    padding: 3px 10px 3px 8px;
    border-radius: 999px;
    border: 0;
    background: color-mix(in oklch, var(--c) 16%, transparent);
    color: var(--ink);
    font: inherit;
    font-size: var(--text-micro);
    font-weight: 600;
    line-height: 1.5;
  }
  button.chip {
    cursor: pointer;
    transition: background 120ms ease;
  }
  button.chip:hover {
    background: color-mix(in oklch, var(--c) 28%, transparent);
  }
  .muted {
    background: transparent;
    box-shadow: inset 0 0 0 1.5px color-mix(in oklch, var(--c) 70%, transparent);
    color: var(--ink-soft);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--c);
    flex: none;
  }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
