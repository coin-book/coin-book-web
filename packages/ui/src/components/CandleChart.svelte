<script lang="ts" module>
  export type CandleBar = {
    day: string;
    /** Decimal strings; open, high and low may be missing where only a close is known. */
    open?: string | null;
    high?: string | null;
    low?: string | null;
    close: string;
  };
  export type CandleMarker = { day: string; kind: 'buy' | 'sell' };
  export type CandleLabels = {
    open: string;
    high: string;
    low: string;
    close: string;
    buy: string;
    sell: string;
    rising: string;
    falling: string;
    table: string;
  };
</script>

<script lang="ts">
  import { dayLabel, shortDate, shortMonth } from '@coin-book/core/dates';
  import { i18n } from '@coin-book/core/i18n';
  import { formatPrice } from '@coin-book/core/money';

  type Props = {
    candles: CandleBar[];
    markers?: CandleMarker[];
    currency: string;
    label: string;
    labels: CandleLabels;
  };

  let { candles, markers = [], currency, label, labels }: Props = $props();

  const HEIGHT = 300;
  const PADDING = { top: 16, right: 64, bottom: 26, left: 6 };
  const MAX_BODY = 11;
  const MARKER_GAP = 7;
  const MARKER_SIZE = 6;
  const MIN_LABEL_SPACING = 56;
  const Y_TICKS = 4;

  let width = $state(0);
  let hovered = $state<number | null>(null);
  let showTable = $state(false);

  type Point = { day: string; open: number; high: number; low: number; close: number; full: boolean };

  const points = $derived<Point[]>(
    candles.map((c) => {
      const close = Number(c.close);
      const open = c.open != null ? Number(c.open) : close;
      const high = c.high != null ? Number(c.high) : Math.max(open, close);
      const low = c.low != null ? Number(c.low) : Math.min(open, close);
      return { day: c.day, open, high, low, close, full: c.open != null };
    }),
  );

  const plotWidth = $derived(Math.max(0, width - PADDING.left - PADDING.right));
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const band = $derived(plotWidth / Math.max(1, points.length));
  const bodyWidth = $derived(Math.max(1, Math.min(MAX_BODY, band * 0.6)));

  const domain = $derived.by(() => {
    if (points.length === 0) return { min: 0, max: 1 };
    let min = Math.min(...points.map((p) => p.low));
    let max = Math.max(...points.map((p) => p.high));
    if (min === max) [min, max] = [min * 0.99, max * 1.01 || 1];
    const pad = (max - min) * 0.06;
    return { min: min - pad, max: max + pad };
  });

  function x(i: number) {
    return PADDING.left + (i + 0.5) * band;
  }
  function y(v: number) {
    return PADDING.top + ((domain.max - v) / (domain.max - domain.min)) * plotHeight;
  }

  /** Round tick values: steps of 1, 2, 2.5 or 5 times a power of ten. */
  const yTicks = $derived.by(() => {
    const raw = (domain.max - domain.min) / Y_TICKS;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
    const ticks: number[] = [];
    for (let v = Math.ceil(domain.min / step) * step; v <= domain.max; v += step) ticks.push(v);
    return ticks;
  });

  const monthTicks = $derived.by(() => {
    const ticks: { i: number; label: string }[] = [];
    let lastX = -Infinity;
    points.forEach((p, i) => {
      const month = p.day.slice(0, 7);
      if (i > 0 && points[i - 1].day.slice(0, 7) === month) return;
      if (x(i) - lastX < MIN_LABEL_SPACING) return;
      ticks.push({ i, label: shortMonth(month, i18n.locale) });
      lastX = x(i);
    });
    return ticks;
  });

  /** A trade lands on the first trading day on or after it; one outside the range is not drawn. */
  const placedMarkers = $derived.by(() => {
    const placed: { i: number; kind: CandleMarker['kind'] }[] = [];
    for (const m of markers) {
      const i = points.findIndex((p) => p.day >= m.day);
      if (i >= 0 && (i > 0 || points[0].day === m.day)) placed.push({ i, kind: m.kind });
    }
    return placed;
  });

  function markerPath(i: number, kind: CandleMarker['kind']) {
    const cx = x(i);
    if (kind === 'buy') {
      const top = y(points[i].low) + MARKER_GAP;
      return `M${cx},${top} l${MARKER_SIZE},${MARKER_SIZE * 1.6} h${-MARKER_SIZE * 2} Z`;
    }
    const bottom = y(points[i].high) - MARKER_GAP;
    return `M${cx},${bottom} l${MARKER_SIZE},${-MARKER_SIZE * 1.6} h${-MARKER_SIZE * 2} Z`;
  }

  function onpointermove(e: PointerEvent) {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left - PADDING.left) / band);
    hovered = i >= 0 && i < points.length ? i : null;
  }

  const hoveredPoint = $derived(hovered !== null ? points[hovered] : null);
  const hoveredTrades = $derived(
    hovered !== null ? placedMarkers.filter((m) => m.i === hovered).map((m) => m.kind) : [],
  );
  const price = (v: number) => formatPrice(String(v), currency);
  const tooltipLeft = $derived(hovered !== null ? Math.min(x(hovered) + 12, Math.max(0, width - 200)) : 0);
</script>

<figure class="candles" bind:clientWidth={width}>
  {#if !showTable}
    <svg
      {width}
      height={HEIGHT}
      role="img"
      aria-label={label}
      {onpointermove}
      onpointerleave={() => (hovered = null)}
    >
      {#each yTicks as v (v)}
        <line class="grid" x1={PADDING.left} x2={PADDING.left + plotWidth} y1={y(v)} y2={y(v)} />
        <text class="axis" x={PADDING.left + plotWidth + 8} y={y(v)} dy="0.32em">{price(v)}</text>
      {/each}
      {#each monthTicks as tick (tick.i)}
        <text class="axis" x={x(tick.i)} y={HEIGHT - 6} text-anchor="middle">{tick.label}</text>
      {/each}
      {#if hoveredPoint && hovered !== null}
        <line
          class="crosshair"
          x1={x(hovered)}
          x2={x(hovered)}
          y1={PADDING.top}
          y2={PADDING.top + plotHeight}
        />
      {/if}
      {#each points as p, i (p.day)}
        {@const rising = p.close >= p.open}
        <g class="candle" class:rising class:falling={!rising} class:dim={hovered !== null && hovered !== i}>
          <line class="wick" x1={x(i)} x2={x(i)} y1={y(p.high)} y2={y(p.low)} />
          {#if p.full}
            <rect
              x={x(i) - bodyWidth / 2}
              y={y(Math.max(p.open, p.close))}
              width={bodyWidth}
              height={Math.max(1, Math.abs(y(p.open) - y(p.close)))}
              rx="1"
            />
          {:else}
            <line
              class="close-tick"
              x1={x(i) - bodyWidth / 2}
              x2={x(i) + bodyWidth / 2}
              y1={y(p.close)}
              y2={y(p.close)}
            />
          {/if}
        </g>
      {/each}
      {#each placedMarkers as m, k (k)}
        <path class="marker {m.kind}" d={markerPath(m.i, m.kind)} />
      {/each}
    </svg>
    {#if hoveredPoint}
      <div class="tip" style="left: {tooltipLeft}px" role="status">
        <strong>{dayLabel(hoveredPoint.day, i18n.locale)}</strong>
        <dl>
          {#if hoveredPoint.full}
            <dt>{labels.open}</dt>
            <dd class="num">{price(hoveredPoint.open)}</dd>
            <dt>{labels.high}</dt>
            <dd class="num">{price(hoveredPoint.high)}</dd>
            <dt>{labels.low}</dt>
            <dd class="num">{price(hoveredPoint.low)}</dd>
          {/if}
          <dt>{labels.close}</dt>
          <dd class="num">{price(hoveredPoint.close)}</dd>
        </dl>
        {#each hoveredTrades as kind, k (k)}
          <p class="trade {kind}">{kind === 'buy' ? labels.buy : labels.sell}</p>
        {/each}
      </div>
    {/if}
    <ul class="legend">
      <li><i class="key rising"></i>{labels.rising}</li>
      <li><i class="key falling"></i>{labels.falling}</li>
      <li>
        <svg class="key-marker buy" viewBox="0 0 12 10" aria-hidden="true"><path d="M6,0 L12,10 H0 Z" /></svg
        >{labels.buy}
      </li>
      <li>
        <svg class="key-marker sell" viewBox="0 0 12 10" aria-hidden="true"><path d="M6,10 L12,0 H0 Z" /></svg
        >{labels.sell}
      </li>
    </ul>
  {:else}
    <table>
      <caption class="sr-only">{label}</caption>
      <thead>
        <tr
          ><th></th><th>{labels.open}</th><th>{labels.high}</th><th>{labels.low}</th><th>{labels.close}</th
          ></tr
        >
      </thead>
      <tbody>
        {#each [...candles].reverse() as c (c.day)}
          <tr>
            <td>{shortDate(c.day)}</td>
            <td class="num">{c.open != null ? formatPrice(c.open, currency) : ''}</td>
            <td class="num">{c.high != null ? formatPrice(c.high, currency) : ''}</td>
            <td class="num">{c.low != null ? formatPrice(c.low, currency) : ''}</td>
            <td class="num">{formatPrice(c.close, currency)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
  <button type="button" class="toggle" aria-pressed={showTable} onclick={() => (showTable = !showTable)}
    >{labels.table}</button
  >
</figure>

<style>
  .candles {
    position: relative;
    margin: 0;
    width: 100%;
    --candle-rising: var(--income);
    --candle-falling: color-mix(in oklch, var(--ink) 70%, var(--surface));
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
  .axis {
    fill: var(--ink-faint);
    font-size: var(--text-micro);
  }
  .crosshair {
    stroke: var(--ink-faint);
    stroke-dasharray: 3 3;
  }
  .wick,
  .close-tick {
    stroke-width: 1.5;
  }
  .candle {
    transition: opacity 120ms ease;
  }
  .candle.dim {
    opacity: 0.55;
  }
  /* Rising days are hollow, falling days filled, so the direction reads without colour. */
  .rising .wick,
  .rising .close-tick,
  .rising rect {
    stroke: var(--candle-rising);
  }
  .rising rect {
    fill: var(--surface);
    stroke-width: 1.5;
  }
  .falling .wick,
  .falling .close-tick {
    stroke: var(--candle-falling);
  }
  .falling rect {
    fill: var(--candle-falling);
  }
  .marker,
  .key-marker path {
    stroke: var(--surface);
    stroke-width: 2;
    paint-order: stroke;
  }
  .marker.buy,
  .key-marker.buy path {
    fill: var(--brand);
  }
  .marker.sell,
  .key-marker.sell path {
    fill: var(--ink);
  }
  .tip {
    position: absolute;
    top: 8px;
    min-width: 170px;
    padding: 10px 12px;
    background: var(--surface-raised);
    box-shadow: var(--shadow-float);
    border-radius: 10px;
    font-size: var(--text-micro);
    pointer-events: none;
  }
  .tip dl {
    display: grid;
    grid-template-columns: auto auto;
    gap: 2px 14px;
    margin: 6px 0 0;
  }
  .tip dt {
    color: var(--ink-soft);
  }
  .tip dd {
    margin: 0;
    text-align: right;
  }
  .trade {
    margin: 6px 0 0;
    font-weight: 650;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .key {
    width: 8px;
    height: 12px;
    border-radius: 1px;
    border: 1.5px solid var(--candle-rising);
  }
  .key.falling {
    border-color: var(--candle-falling);
    background: var(--candle-falling);
  }
  .key-marker {
    width: 12px;
    height: 10px;
    overflow: visible;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-micro);
  }
  th {
    text-align: right;
    color: var(--ink-soft);
    font-weight: 600;
  }
  td {
    padding: 4px 0;
    border-top: 1px solid var(--line);
  }
  td.num {
    text-align: right;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  .toggle {
    margin-top: 10px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--ink-soft);
    font: inherit;
    font-size: var(--text-micro);
    text-decoration: underline;
    cursor: pointer;
  }
</style>
