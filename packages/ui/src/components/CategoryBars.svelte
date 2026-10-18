<script lang="ts" module>
  export type CategoryBar = {
    key: string;
    label: string;
    colorKey: string;
    amountMinor: number;
    href?: string;
  };
</script>

<script lang="ts">
  import { BarChart, Tooltip } from 'layerchart/svg';
  import { colorVar } from '@coin-book/core/colors';
  import { formatWhole } from '@coin-book/core/money';

  type Props = {
    bars: CategoryBar[];
    currency: string;
    label: string;
    /** Called when anywhere on a bar's row is clicked. */
    onselect?: (bar: CategoryBar) => void;
  };

  let { bars, currency, label, onselect }: Props = $props();

  // Each row is a caption line (name left, amount right) over a full-width bar.
  const ROW_HEIGHT = 42;
  const BAR_HEIGHT = 10;
  const CAPTION_OFFSET = 13;
  const PADDING = { top: 0, right: 0, bottom: 0, left: 0 };

  let width = $state(0);

  const ranked = $derived([...bars].sort((a, b) => b.amountMinor - a.amountMinor));
  const total = $derived(ranked.reduce((sum, b) => sum + b.amountMinor, 0));
  const height = $derived(ranked.length * ROW_HEIGHT);
  const byKey = $derived(new Map(ranked.map((b) => [b.key, b])));

  function share(b: CategoryBar) {
    return total > 0 ? Math.round((b.amountMinor / total) * 100) : 0;
  }
</script>

<nav
  class="bars"
  class:clickable={onselect}
  aria-label={label}
  bind:clientWidth={width}
  style="height: {height}px"
>
  <BarChart
    data={ranked}
    y="key"
    x="amountMinor"
    orientation="horizontal"
    series={[{ key: 'amount', value: 'amountMinor' }]}
    c="key"
    cDomain={ranked.map((b) => b.key)}
    cRange={ranked.map((b) => colorVar(b.colorKey))}
    padding={PADDING}
    bandPadding={0}
    onTooltipClick={(_e, detail) => {
      const bar = byKey.get((detail.data as CategoryBar).key);
      if (bar) onselect?.(bar);
    }}
    axis={false}
    grid={false}
    rule={false}
    props={{
      bars: { radius: 5, strokeWidth: 0, height: BAR_HEIGHT },
      svg: { role: 'img', 'aria-label': label },
    }}
  >
    {#snippet belowMarks({ context })}
      {#each ranked as b (b.key)}
        {@const barY = (context.yScale(b.key) ?? 0) + (context.yScale.bandwidth?.() ?? 0) / 2}
        <!-- A faint track shows the full width each bar is measured against. -->
        <rect class="track" x={0} y={barY - BAR_HEIGHT / 2} {width} height={BAR_HEIGHT} rx="5" />
      {/each}
    {/snippet}

    {#snippet aboveMarks({ context })}
      <!-- The <g> keeps the links in the SVG namespace; at a snippet's root they would be HTML. -->
      <g class="captions">
        {#each ranked as b (b.key)}
          {@const captionY =
            (context.yScale(b.key) ?? 0) + (context.yScale.bandwidth?.() ?? 0) / 2 - CAPTION_OFFSET}
          <svelte:element this={b.href ? 'a' : 'g'} href={b.href} class="name-link">
            <text class="name" x={0} y={captionY}>{b.label}</text>
          </svelte:element>
          <text class="value num" x={width} y={captionY} text-anchor="end">
            {formatWhole(b.amountMinor, currency)}<tspan class="share"
              >{'\u00a0·\u00a0'}{share(b)}{'\u00a0'}%</tspan
            >
          </text>
        {/each}
      </g>
    {/snippet}

    {#snippet tooltip()}
      <Tooltip.Root>
        {#snippet children({ data }: { data: CategoryBar })}
          {@const b = byKey.get(data.key) ?? data}
          <Tooltip.Header value={b.label} />
          <Tooltip.List>
            <Tooltip.Item
              label="{share(b)} %"
              value={formatWhole(b.amountMinor, currency)}
              color={colorVar(b.colorKey)}
              valueAlign="right"
            />
          </Tooltip.List>
        {/snippet}
      </Tooltip.Root>
    {/snippet}
  </BarChart>
</nav>

<style>
  .bars {
    display: block;
    width: 100%;
    font-size: var(--text-micro);
  }
  .bars :global(svg) {
    overflow: visible;
  }
  .clickable :global(svg) {
    cursor: pointer;
  }
  .track {
    fill: color-mix(in oklch, var(--ink) 6%, transparent);
  }
  .name {
    fill: var(--ink);
    font-weight: 600;
  }
  .name-link {
    text-decoration: none;
  }
  .name-link:hover .name,
  .name-link:focus-visible .name {
    text-decoration: underline;
  }
  .value {
    fill: var(--ink-soft);
    font-weight: 500;
  }
  .share {
    fill: var(--ink-faint);
  }
</style>
