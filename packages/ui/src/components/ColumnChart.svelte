<script lang="ts" module>
  export type ColumnSeries = {
    key: string;
    label: string;
    /** A CSS color expression, usually a token such as var(--income). */
    color: string;
  };
  export type ColumnGroup = {
    key: string;
    label: string;
    values: Record<string, number>;
    href?: string;
    current?: boolean;
  };
</script>

<script lang="ts">
  import { formatWhole } from '@coin-book/core/money';

  type Props = {
    series: ColumnSeries[];
    groups: ColumnGroup[];
    currency: string;
    label: string;
    /** stacked: one column per group, segments per series; grouped: a column per series side by side. */
    mode?: 'grouped' | 'stacked';
  };

  let { series, groups, currency, label, mode = 'grouped' }: Props = $props();

  const PLOT_HEIGHT = 160;
  const AXIS_WIDTH = 44;
  const LABEL_BAND = 22;
  const MAX_COLUMN = 24;
  const GAP = 2;

  let width = $state(720);
  let hovered = $state<string | null>(null);

  const plotWidth = $derived(Math.max(0, width - AXIS_WIDTH));
  const band = $derived(groups.length > 0 ? plotWidth / groups.length : 0);

  const columnWidth = $derived(
    mode === 'stacked'
      ? Math.min(MAX_COLUMN, band * 0.6)
      : Math.min(MAX_COLUMN, (band * 0.7 - GAP * (series.length - 1)) / Math.max(1, series.length)),
  );

  function groupTotal(g: ColumnGroup) {
    return mode === 'stacked'
      ? series.reduce((sum, s) => sum + (g.values[s.key] ?? 0), 0)
      : Math.max(...series.map((s) => g.values[s.key] ?? 0), 0);
  }

  const max = $derived(Math.max(1, ...groups.map(groupTotal)));

  // Clean tick values: 0, a nice step, and multiples up to the maximum.
  const ticks = $derived.by(() => {
    const raw = max / 3;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map((m) => m * magnitude).find((v) => v >= raw) ?? magnitude;
    const out: number[] = [];
    for (let v = 0; v <= max; v += step) out.push(v);
    return out;
  });

  function y(value: number) {
    return PLOT_HEIGHT - (value / max) * PLOT_HEIGHT;
  }

  function compact(minor: number) {
    const major = minor / 100;
    if (Math.abs(major) >= 1_000_000) return `${(major / 1_000_000).toFixed(1).replace('.0', '')}M`;
    if (Math.abs(major) >= 1000) return `${Math.round(major / 1000)}k`;
    return String(Math.round(major));
  }

  function stackOffset(g: ColumnGroup, index: number) {
    return series.slice(0, index).reduce((sum, s) => sum + (g.values[s.key] ?? 0), 0);
  }
</script>

<div class="chart" bind:clientWidth={width}>
  <svg
    viewBox="0 0 {width} {PLOT_HEIGHT + LABEL_BAND}"
    {width}
    height={PLOT_HEIGHT + LABEL_BAND}
    role="img"
    aria-label={label}
  >
    <g class="grid">
      {#each ticks as tick (tick)}
        <line x1={AXIS_WIDTH} x2={width} y1={y(tick)} y2={y(tick)} />
        <text x={AXIS_WIDTH - 6} y={y(tick)} text-anchor="end" dominant-baseline="middle" class="num"
          >{compact(tick)}</text
        >
      {/each}
    </g>
    {#each groups as g, gi (g.key)}
      {@const left = AXIS_WIDTH + gi * band}
      {@const total = groupTotal(g)}
      <g
        class="group"
        role="group"
        aria-label={g.label}
        class:dim={hovered !== null && hovered !== g.key}
        onmouseenter={() => (hovered = g.key)}
        onmouseleave={() => (hovered = null)}
        onfocusin={() => (hovered = g.key)}
        onfocusout={() => (hovered = null)}
      >
        <rect class="hit" x={left} y="0" width={band} height={PLOT_HEIGHT + LABEL_BAND} />
        {#if mode === 'stacked'}
          {@const x = left + (band - columnWidth) / 2}
          {#each series as s, si (s.key)}
            {@const value = g.values[s.key] ?? 0}
            {#if value > 0}
              {@const top = y(stackOffset(g, si) + value)}
              {@const h = Math.max(0, y(stackOffset(g, si)) - top - (si > 0 ? GAP : 0))}
              <rect
                {x}
                y={top}
                width={columnWidth}
                height={h}
                fill={s.color}
                rx={si === series.length - 1 ? 4 : 0}
              />
            {/if}
          {/each}
        {:else}
          {@const start = left + (band - (columnWidth * series.length + GAP * (series.length - 1))) / 2}
          {#each series as s, si (s.key)}
            {@const value = g.values[s.key] ?? 0}
            <rect
              x={start + si * (columnWidth + GAP)}
              y={y(value)}
              width={columnWidth}
              height={Math.max(value > 0 ? 2 : 0, PLOT_HEIGHT - y(value))}
              fill={s.color}
              rx="4"
            />
          {/each}
        {/if}
        {#if g.href}
          <a href={g.href}>
            <text
              class="axis-label"
              class:current={g.current}
              x={left + band / 2}
              y={PLOT_HEIGHT + LABEL_BAND - 4}
              text-anchor="middle">{g.label}</text
            >
          </a>
        {:else}
          <text
            class="axis-label"
            class:current={g.current}
            x={left + band / 2}
            y={PLOT_HEIGHT + LABEL_BAND - 4}
            text-anchor="middle">{g.label}</text
          >
        {/if}
        <title
          >{g.label}: {series
            .filter((s) => (g.values[s.key] ?? 0) > 0)
            .map((s) => `${s.label} ${formatWhole(g.values[s.key] ?? 0, currency)}`)
            .join(', ') || formatWhole(total, currency)}</title
        >
      </g>
    {/each}
  </svg>
  {#if hovered}
    {@const g = groups.find((x) => x.key === hovered)}
    {#if g}
      <p class="tooltip" aria-live="polite">
        <strong>{g.label}</strong>
        {#each series.filter((s) => (g.values[s.key] ?? 0) > 0) as s (s.key)}
          <span
            ><i class="swatch" style="--c: {s.color}"></i>{s.label}
            <b class="num">{formatWhole(g.values[s.key] ?? 0, currency)}</b></span
          >
        {/each}
      </p>
    {/if}
  {/if}
  {#if series.length > 1}
    <ul class="legend">
      {#each series as s (s.key)}
        <li><i class="swatch" style="--c: {s.color}"></i>{s.label}</li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .chart {
    width: 100%;
    position: relative;
  }
  svg {
    display: block;
    max-width: 100%;
    height: auto;
    font-size: var(--text-micro);
    overflow: visible;
  }
  .grid line {
    stroke: var(--line);
    stroke-width: 1;
  }
  .grid text,
  .axis-label {
    fill: var(--ink-faint);
  }
  .axis-label.current {
    fill: var(--ink);
    font-weight: 600;
  }
  .group .hit {
    fill: transparent;
  }
  .group {
    transition: opacity 160ms ease;
  }
  .group.dim {
    opacity: 0.45;
  }
  .group a:hover .axis-label,
  .group a:focus-visible .axis-label {
    fill: var(--ink);
    text-decoration: underline;
  }
  .tooltip {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin: 8px 0 0;
    min-height: 1.4em;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .tooltip b {
    color: var(--ink);
    font-weight: 600;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: var(--c);
    margin-right: 6px;
    vertical-align: -1px;
  }
  @media (prefers-reduced-motion: reduce) {
    .group {
      transition: none;
    }
  }
</style>
