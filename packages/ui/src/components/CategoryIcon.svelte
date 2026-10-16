<script lang="ts">
  import { colorVar } from '@coin-book/core/colors';
  import Icon from './Icon.svelte';

  type Props = { colorKey: string; icon: string; size?: number };

  let { colorKey, icon, size = 34 }: Props = $props();
</script>

<span class="badge" style="--c: {colorVar(colorKey)}; --s: {size}px">
  <Icon name={icon} size={size * 0.56} weight="duotone" color={colorVar(colorKey)} />
</span>

<style>
  .badge {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: var(--s);
    height: var(--s);
    border-radius: 999px;
    background: color-mix(in oklch, var(--c) 18%, transparent);
  }
</style>
