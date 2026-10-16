<script lang="ts" module>
  export type RibbonSegment = {
    key: string;
    label: string;
    colorKey: string;
    amountMinor: number;
    href?: string;
  };
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { colorVar } from '@coin-book/core/colors';
  import { formatWhole } from '@coin-book/core/money';

  type Props = { segments: RibbonSegment[]; currency: string; label: string };

  let { segments, currency, label }: Props = $props();

  let active = $state<string | null>(null);
  let shown = $state(false);
  onMount(() => requestAnimationFrame(() => (shown = true)));

  const total = $derived(segments.reduce((sum, s) => sum + s.amountMinor, 0));
  const legend = $derived(active ? segments.filter((s) => s.key === active) : segments.slice(0, 5));

  function share(minor: number) {
    return total > 0 ? Math.round((minor / total) * 100) : 0;
  }
</script>

<div class="ribbon-wrap">
  <nav class="ribbon" class:shown aria-label={label}>
    {#each segments as s, i (s.key)}
      <a
        class="segment"
        class:dim={active !== null && active !== s.key}
        href={s.href}
        style="--c: {colorVar(s.colorKey)}; flex-grow: {s.amountMinor}; transition-delay: {i * 40}ms"
        aria-label="{s.label}: {formatWhole(s.amountMinor, currency)}, {share(s.amountMinor)} %"
        onmouseenter={() => (active = s.key)}
        onmouseleave={() => (active = null)}
        onfocus={() => (active = s.key)}
        onblur={() => (active = null)}
      ></a>
    {/each}
  </nav>
  <ul class="legend">
    {#each legend as s (s.key)}
      <li style="--c: {colorVar(s.colorKey)}">
        <span class="dot"></span>
        <span class="name">{s.label}</span>
        <span class="num amount">{formatWhole(s.amountMinor, currency)}</span>
        <span class="num pct">{share(s.amountMinor)} %</span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .ribbon {
    display: flex;
    gap: 3px;
    height: 44px;
  }
  .segment {
    flex-basis: 6px;
    min-width: 6px;
    background: var(--c);
    border-radius: 6px;
    transform: scaleY(0.2);
    transform-origin: bottom;
    opacity: 0;
    transition:
      transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1),
      opacity 300ms ease,
      filter 150ms ease;
  }
  .shown .segment {
    transform: scaleY(1);
    opacity: 1;
  }
  .segment:first-child {
    border-radius: 14px 6px 6px 14px;
  }
  .segment:last-child {
    border-radius: 6px 14px 14px 6px;
  }
  .segment.dim {
    filter: saturate(0.25) opacity(0.45);
  }
  .legend {
    list-style: none;
    margin: 14px 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 22px;
    min-height: 1.6em;
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: var(--text-micro);
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: var(--c);
  }
  .name {
    font-weight: 600;
  }
  .amount {
    color: var(--ink-soft);
  }
  .pct {
    color: var(--ink-faint);
  }
</style>
