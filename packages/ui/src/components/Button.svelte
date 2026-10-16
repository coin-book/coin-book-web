<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import Icon from './Icon.svelte';

  type Props = HTMLButtonAttributes & {
    variant?: 'primary' | 'quiet' | 'danger' | 'ghost';
    icon?: string;
    href?: string;
    busy?: boolean;
    children: Snippet;
  };

  let {
    variant = 'primary',
    icon,
    href,
    busy = false,
    children,
    class: className = '',
    ...rest
  }: Props = $props();
</script>

{#if href}
  <a {href} class="btn {variant} {className}">
    {#if icon}<Icon name={icon} size={17} weight="bold" />{/if}
    {@render children()}
  </a>
{:else}
  <button class="btn {variant} {className}" aria-busy={busy} disabled={busy || rest.disabled} {...rest}>
    {#if icon}<Icon name={icon} size={17} weight="bold" />{/if}
    {@render children()}
  </button>
{/if}

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 9px 16px;
    border-radius: var(--radius-input);
    border: 0;
    font: inherit;
    font-weight: 650;
    text-decoration: none;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background 120ms ease,
      transform 80ms ease;
  }
  .btn:active {
    transform: translateY(1px);
  }
  .btn:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .primary {
    background: var(--brand);
    color: var(--brand-ink);
    box-shadow: var(--glow);
  }
  .primary:hover:not(:disabled) {
    background: color-mix(in oklch, var(--brand) 88%, var(--ink));
  }
  .quiet {
    background: color-mix(in oklch, var(--brand) 11%, transparent);
    color: var(--brand);
  }
  .quiet:hover:not(:disabled) {
    background: color-mix(in oklch, var(--brand) 18%, transparent);
  }
  .danger {
    background: color-mix(in oklch, var(--over) 14%, transparent);
    color: var(--over);
  }
  .ghost {
    background: transparent;
    color: var(--ink-soft);
    padding-inline: 10px;
  }
  .ghost:hover:not(:disabled) {
    background: color-mix(in oklch, var(--ink) 6%, transparent);
    color: var(--ink);
  }
  [aria-busy='true'] {
    cursor: progress;
  }
</style>
