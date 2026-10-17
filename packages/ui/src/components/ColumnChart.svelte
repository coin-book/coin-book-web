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
    current?: boolean;
  };
</script>

<script lang="ts">
  import { BarChart, Tooltip } from 'layerchart/svg';
  import { formatWhole } from '@coin-book/core/money';

  type Props = {
    series: ColumnSeries[];
    groups: ColumnGroup[];
    currency: string;
    label: string;
    /** stacked: one column per group, segments per series; grouped: a column per series side by side. */
    mode?: 'grouped' | 'stacked';
    /** Called with a group's key when its column is clicked. */
    onselect?: (key: string) => void;
  };

  let { series, groups, currency, label, mode = 'grouped', onselect }: Props = $props();

  const PLOT_HEIGHT = 200;
  const PADDING = { top: 12, right: 4, bottom: 24, left: 44 };
  const MAX_COLUMN = 24;

  let width = $state(0);

  const byKey = $derived(new Map(groups.map((g) => [g.key, g])));

  // A cap per column, not a share of the band: twelve months on a wide page would
  // otherwise turn into slabs.
  const columnWidth = $derived.by(() => {
    const band = Math.max(0, width - PADDING.left - PADDING.right) / Math.max(1, groups.length);
    const perColumn = mode === 'stacked' ? band * 0.6 : (band * 0.7) / Math.max(1, series.length);
    return Math.max(4, Math.min(MAX_COLUMN, perColumn));
  });

  const chartSeries = $derived(
    series.map((s) => ({
      key: s.key,
      label: s.label,
      color: s.color,
      value: (g: ColumnGroup) => g.values[s.key] ?? 0,
    })),
  );

  /** Compact tick labels from minor units: 0, 20k, 1,5M. */
  function compact(minor: number) {
    const major = minor / 100;
    if (Math.abs(major) >= 1_000_000)
      return `${(major / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')}M`;
    if (Math.abs(major) >= 1000) return `${Math.round(major / 1000)}k`;
    return String(Math.round(major));
  }
</script>

<div class="chart" bind:clientWidth={width}>
  <div class="plot" style="height: {PLOT_HEIGHT}px">
    <BarChart
      data={groups}
      x="key"
      series={chartSeries}
      seriesLayout={mode === 'stacked' ? 'stack' : 'group'}
      stackPadding={2}
      groupPadding={0.1}
      padding={PADDING}
      yNice
      onTooltipClick={(_e, detail) => onselect?.((detail.data as ColumnGroup).key)}
      props={{
        xAxis: {
          format: (key: string) => byKey.get(key)?.label ?? '',
          tickLength: 0,
          tickLabelProps: { dy: 4, class: 'axis-label' },
        },
        yAxis: { format: compact, ticks: 3, tickLength: 0, tickLabelProps: { class: 'axis-label' } },
        grid: { class: 'grid-line' },
        rule: { class: 'grid-line' },
        bars: { width: columnWidth, strokeWidth: 0, radius: 4, class: onselect ? 'clickable' : '' },
        svg: { role: 'img', 'aria-label': label },
      }}
    >
      {#snippet belowMarks({ context })}
        {#each groups.filter((g) => g.current) as g (g.key)}
          <!-- The month the page is showing gets a quiet band behind its columns. -->
          <rect
            class="current"
            x={context.xScale(g.key) ?? 0}
            y={0}
            width={context.xScale.bandwidth?.() ?? 0}
            height={context.height}
            rx="6"
          />
        {/each}
      {/snippet}

      {#snippet tooltip()}
        <Tooltip.Root>
          {#snippet children({ data }: { data: ColumnGroup })}
            <Tooltip.Header value={data.label} />
            <Tooltip.List>
              {#each series.filter((s) => (data.values[s.key] ?? 0) > 0) as s (s.key)}
                <Tooltip.Item
                  label={s.label}
                  value={formatWhole(data.values[s.key] ?? 0, currency)}
                  color={s.color}
                  valueAlign="right"
                />
              {:else}
                <Tooltip.Item label="" value={formatWhole(0, currency)} valueAlign="right" />
              {/each}
            </Tooltip.List>
          {/snippet}
        </Tooltip.Root>
      {/snippet}
    </BarChart>
  </div>
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
  }
  .plot {
    width: 100%;
    font-size: var(--text-micro);
  }
  .plot :global(.axis-label) {
    fill: var(--ink-faint);
    stroke: none;
  }
  .plot :global(.grid-line) {
    stroke: var(--line);
  }
  .plot :global(.clickable) {
    cursor: pointer;
  }
  .current {
    fill: color-mix(in oklch, var(--ink) 5%, transparent);
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
</style>
