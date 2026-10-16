<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  type Props = { icon: string; title: string; lead?: string; children?: Snippet };

  let { icon, title, lead, children }: Props = $props();
</script>

<div class="empty">
  <span class="glyph"><Icon name={icon} size={30} weight="duotone" /></span>
  <h2 class="display">{title}</h2>
  {#if lead}<p>{lead}</p>{/if}
  {#if children}<div class="actions">{@render children()}</div>{/if}
</div>

<style>
  .empty {
    display: grid;
    justify-items: center;
    text-align: center;
    gap: 8px;
    padding: 56px 16px;
  }
  .glyph {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    border-radius: 999px;
    background: color-mix(in oklch, var(--brand) 12%, transparent);
    color: var(--brand);
    margin-bottom: 6px;
  }
  h2 {
    margin: 0;
    font-size: var(--text-title);
  }
  p {
    margin: 0;
    max-width: 46ch;
    color: var(--ink-soft);
  }
  .actions {
    margin-top: 12px;
  }
</style>
