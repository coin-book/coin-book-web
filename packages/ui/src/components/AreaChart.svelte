<script lang="ts" module>
  export type AreaPoint = {
    key: string;
    /** Axis and tooltip label, e.g. a short month. */
    label: string;
    valueMinor: number;
    /** Extra tooltip lines under the value. */
    details?: { label: string; valueMinor: number }[];
  };
</script>

<script lang="ts">
  import { formatWhole } from '@coin-book/core/money';

  type Props = {
    /** Oldest first. */
    points: AreaPoint[];
    currency: string;
    label: string;
    /** Header of the value column in the table view. */
    valueLabel: string;
    /** Header of the first column in the table view. */
    keyLabel: string;
    tableLabel: string;
    chartLabel: string;
    /** How many axis labels at most; the rest are left out evenly. */
    maxAxisLabels?: number;
  };

  let {
    points,
    currency,
    label,
    valueLabel,
    keyLabel,
    tableLabel,
    chartLabel,
    maxAxisLabels = 8,
  }: Props = $props();

  const HEIGHT = 220;
  const PADDING = { top: 14, right: 12, bottom: 26, left: 100 };
  const Y_TICKS = 4;

  let width = $state(0);
  let hovered = $state<number | null>(null);
  let asTable = $state(false);

  const plotWidth = $derived(Math.max(0, width - PADDING.left - PADDING.right));
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  // Zero stays on the axis, so a fall below it reads as a debt rather than a dip.
  const domain = $derived.by(() => {
    const values = points.map((p) => p.valueMinor);
    const low = Math.min(0, ...values);
    const high = Math.max(0, ...values);
    return high === low ? { low, high: low + 1 } : { low, high };
  });
  const yTicks = $derived(niceTicks(domain.low, domain.high, Y_TICKS));
  const yLow = $derived(Math.min(domain.low, yTicks[0] ?? domain.low));
  const yHigh = $derived(Math.max(domain.high, yTicks[yTicks.length - 1] ?? domain.high));

  function x(i: number) {
    return PADDING.left + (points.length < 2 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  }
  function y(v: number) {
    return PADDING.top + (1 - (v - yLow) / (yHigh - yLow || 1)) * plotHeight;
  }

  function niceTicks(low: number, high: number, count: number): number[] {
    const span = high - low;
    if (span <= 0) return [low];
    const raw = span / count;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const nice = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
    // Amounts are whole minor units: a finer step would round into repeated ticks.
    const step = Math.max(1, Math.round(nice));
    const ticks = new Set<number>();
    for (let v = Math.floor(low / step) * step; v <= high + step / 2; v += step) ticks.add(Math.round(v));
    return [...ticks];
  }

  const line = $derived(
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.valueMinor).toFixed(1)}`).join(''),
  );
  const area = $derived(
    points.length > 1
      ? `${line}L${x(points.length - 1).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`
      : '',
  );
  const labelEvery = $derived(Math.max(1, Math.ceil(points.length / maxAxisLabels)));

  function onpointermove(e: PointerEvent) {
    if (points.length === 0) return;
    const svg = e.currentTarget as SVGSVGElement;
    const offset = e.clientX - svg.getBoundingClientRect().left - PADDING.left;
    const i = points.length < 2 ? 0 : Math.round((offset / (plotWidth || 1)) * (points.length - 1));
    hovered = Math.max(0, Math.min(points.length - 1, i));
  }

  const hoveredPoint = $derived(hovered !== null ? points[hovered] : null);
  const tooltipLeft = $derived(hovered !== null ? Math.min(x(hovered) + 12, Math.max(0, width - 230)) : 0);
</script>

<figure class="area-chart">
  <div class="toggle">
    <button type="button" aria-pressed={!asTable} onclick={() => (asTable = false)}>{chartLabel}</button>
    <button type="button" aria-pressed={asTable} onclick={() => (asTable = true)}>{tableLabel}</button>
  </div>
  {#if asTable}
    <table>
      <thead><tr><th scope="col">{keyLabel}</th><th scope="col" class="num">{valueLabel}</th></tr></thead>
      <tbody>
        {#each points as p (p.key)}
          <tr><th scope="row">{p.label}</th><td class="num">{formatWhole(p.valueMinor, currency)}</td></tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <div class="plot" bind:clientWidth={width}>
      {#if width > 0}
        <svg
          {width}
          height={HEIGHT}
          role="img"
          aria-label={label}
          {onpointermove}
          onpointerleave={() => (hovered = null)}
        >
          {#each yTicks as v (v)}
            <line
              class="grid"
              class:zero={v === 0}
              x1={PADDING.left}
              x2={PADDING.left + plotWidth}
              y1={y(v)}
              y2={y(v)}
            />
            <text class="axis num" x={PADDING.left - 8} y={y(v)} dy="0.32em" text-anchor="end"
              >{formatWhole(v, currency)}</text
            >
          {/each}
          {#each points as p, i (p.key)}
            {#if i % labelEvery === 0 || i === points.length - 1}
              <text class="axis" x={x(i)} y={HEIGHT - 6} text-anchor="middle">{p.label}</text>
            {/if}
          {/each}
          {#if area}<path class="fill" d={area} />{/if}
          <path class="line" d={line} />
          {#if hoveredPoint && hovered !== null}
            <line
              class="crosshair"
              x1={x(hovered)}
              x2={x(hovered)}
              y1={PADDING.top}
              y2={PADDING.top + plotHeight}
            />
            <circle class="dot" cx={x(hovered)} cy={y(hoveredPoint.valueMinor)} r="5" />
          {:else if points.length > 0}
            <circle
              class="dot"
              cx={x(points.length - 1)}
              cy={y(points[points.length - 1].valueMinor)}
              r="4"
            />
          {/if}
        </svg>
        {#if hoveredPoint}
          <div class="tip" style="left: {tooltipLeft}px" role="status">
            <p class="tip-head">{hoveredPoint.label}</p>
            <p class="tip-value num">{formatWhole(hoveredPoint.valueMinor, currency)}</p>
            {#each hoveredPoint.details ?? [] as d (d.label)}
              <p class="tip-line">
                <span>{d.label}</span><span class="num">{formatWhole(d.valueMinor, currency)}</span>
              </p>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</figure>

<style>
  .area-chart {
    position: relative;
    margin: 0;
    width: 100%;
  }
  .toggle {
    display: flex;
    justify-content: flex-end;
    gap: 2px;
    margin-bottom: 6px;
  }
  .toggle button {
    border: 0;
    background: none;
    padding: 4px 8px;
    border-radius: 8px;
    font: inherit;
    font-size: var(--text-micro);
    font-weight: 600;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .toggle button[aria-pressed='true'] {
    background: color-mix(in oklch, var(--ink) 7%, transparent);
    color: var(--ink);
  }
  .plot {
    position: relative;
  }
  svg {
    display: block;
    overflow: visible;
    touch-action: pan-y;
  }
  .grid {
    stroke: var(--line);
    stroke-width: 1;
  }
  .grid.zero {
    stroke: var(--ink-faint);
  }
  .axis {
    fill: var(--ink-faint);
    font-size: var(--text-micro);
  }
  .line {
    fill: none;
    stroke: var(--brand);
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .fill {
    fill: color-mix(in oklch, var(--brand) 12%, transparent);
  }
  .crosshair {
    stroke: var(--ink-faint);
    stroke-dasharray: 3 3;
  }
  .dot {
    fill: var(--brand);
    stroke: var(--surface);
    stroke-width: 2;
  }
  .tip {
    position: absolute;
    top: 0;
    min-width: 160px;
    max-width: 220px;
    padding: 10px 12px;
    background: var(--surface-raised);
    box-shadow: var(--shadow-float);
    border-radius: 10px;
    font-size: var(--text-micro);
    pointer-events: none;
  }
  .tip p {
    margin: 0;
  }
  .tip-head {
    color: var(--ink-soft);
  }
  .tip-value {
    font-size: var(--text-body);
    font-weight: 700;
    margin: 2px 0 4px !important;
  }
  .tip-line {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: var(--ink-soft);
  }
  .tip-line .num {
    color: var(--ink);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-micro);
  }
  th,
  td {
    text-align: left;
    padding: 6px 4px;
    border-top: 1px solid var(--line);
    font-weight: 500;
  }
  thead th {
    color: var(--ink-faint);
    font-weight: 650;
    border-top: 0;
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  @media (prefers-reduced-motion: no-preference) {
    .dot {
      transition:
        cx 80ms ease,
        cy 80ms ease;
    }
  }
</style>
