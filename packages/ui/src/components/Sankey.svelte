<script lang="ts" module>
  export type SankeyNode = {
    key: string;
    label: string;
    colorKey: string;
    /** Column: 0 sources, 1 accounts, 2 destinations. */
    column: number;
    href?: string;
  };
  export type SankeyLink = { source: string; target: string; amountMinor: number };
</script>

<script lang="ts">
  import {
    sankey,
    sankeyLinkHorizontal,
    sankeyLeft,
    type SankeyGraph,
    type SankeyLink as D3Link,
    type SankeyNode as D3Node,
  } from 'd3-sankey';
  import { colorVar } from '@coin-book/core/colors';
  import { formatWhole } from '@coin-book/core/money';

  type Props = {
    nodes: SankeyNode[];
    links: SankeyLink[];
    currency: string;
    label: string;
    tableLabel: string;
  };

  let { nodes, links, currency, label, tableLabel }: Props = $props();

  type N = D3Node<SankeyNode, { amountMinor: number }>;
  type L = D3Link<SankeyNode, { amountMinor: number }>;

  const NODE_WIDTH = 10;
  const NODE_PADDING = 14;
  const LABEL_SHARE = 0.26;
  const LABEL_MAX_WIDTH = 220;
  const LABEL_MAX_CHARS = 24;
  const LABEL_MAX_CHARS_MIDDLE = 18;
  const ROW_HEIGHT = 30;
  const MIN_HEIGHT = 220;
  const NARROW = 560;

  let width = $state(720);
  let active = $state<string | null>(null);
  let showTable = $state(false);

  const narrow = $derived(width < NARROW);
  const labelWidth = $derived(Math.min(LABEL_MAX_WIDTH, width * LABEL_SHARE));
  const rows = $derived(Math.max(...[0, 1, 2].map((c) => nodes.filter((n) => n.column === c).length)));
  const height = $derived(Math.max(MIN_HEIGHT, rows * ROW_HEIGHT + 40));

  const graph = $derived.by<SankeyGraph<SankeyNode, { amountMinor: number }> | null>(() => {
    if (links.length === 0 || width === 0) return null;
    const layout = sankey<SankeyNode, { amountMinor: number }>()
      .nodeId((d) => d.key)
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .nodeAlign(sankeyLeft)
      .nodeSort(null)
      .extent([
        [labelWidth, 8],
        [width - labelWidth, height - 8],
      ]);
    return layout({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({
        source: l.source,
        target: l.target,
        value: l.amountMinor,
        amountMinor: l.amountMinor,
      })),
    });
  });

  const path = sankeyLinkHorizontal<SankeyNode, { amountMinor: number }>();

  function nodeOf(end: L['source']): N {
    return end as N;
  }

  function touches(l: L, key: string) {
    return nodeOf(l.source).key === key || nodeOf(l.target).key === key;
  }

  function total(n: N) {
    return n.value ?? 0;
  }

  // Sources are labelled on their left, everything else on its right, so labels of
  // neighbouring columns never meet; the middle column skips the amount for room.
  function labelX(n: N) {
    return n.column === 0 ? (n.x0 ?? 0) - 8 : (n.x1 ?? 0) + 8;
  }

  function anchor(n: N) {
    return n.column === 0 ? 'end' : 'start';
  }

  function caption(n: N) {
    return short(n.label, n.column === 1 ? LABEL_MAX_CHARS_MIDDLE : LABEL_MAX_CHARS);
  }

  const byKey = $derived(new Map(nodes.map((n) => [n.key, n])));

  function short(label: string, max: number) {
    return label.length > max ? label.slice(0, max - 1) + '…' : label;
  }
</script>

<div class="sankey" bind:clientWidth={width}>
  {#if graph && !narrow && !showTable}
    <svg viewBox="0 0 {width} {height}" {width} {height} role="img" aria-label={label}>
      <g class="links">
        {#each graph.links as l (nodeOf(l.source).key + '→' + nodeOf(l.target).key)}
          <path
            role="presentation"
            d={path(l) ?? ''}
            stroke={colorVar(
              nodeOf(l.target).column === 1 ? nodeOf(l.source).colorKey : nodeOf(l.target).colorKey,
            )}
            stroke-width={Math.max(1, l.width ?? 1)}
            class:dim={active !== null && !touches(l, active)}
            onmouseenter={() => (active = nodeOf(l.target).key)}
            onmouseleave={() => (active = null)}
          >
            <title
              >{nodeOf(l.source).label} → {nodeOf(l.target).label}: {formatWhole(
                l.amountMinor,
                currency,
              )}</title
            >
          </path>
        {/each}
      </g>
      <g class="nodes">
        {#each graph.nodes as n (n.key)}
          {@const href = byKey.get(n.key)?.href}
          <g
            role="group"
            aria-label="{n.label}: {formatWhole(total(n), currency)}"
            class:dim={active !== null &&
              active !== n.key &&
              !graph.links.some((l) => touches(l, active ?? '') && touches(l, n.key))}
            onmouseenter={() => (active = n.key)}
            onmouseleave={() => (active = null)}
            onfocusin={() => (active = n.key)}
            onfocusout={() => (active = null)}
          >
            <rect
              x={n.x0}
              y={n.y0}
              width={(n.x1 ?? 0) - (n.x0 ?? 0)}
              height={Math.max(2, (n.y1 ?? 0) - (n.y0 ?? 0))}
              rx="3"
              fill={colorVar(n.colorKey)}
            />
            {#if href}
              <a {href}>
                <text
                  x={labelX(n)}
                  y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
                  text-anchor={anchor(n)}
                  dominant-baseline="middle"
                >
                  {caption(n)}
                  {#if n.column !== 1}<tspan class="num value"> {formatWhole(total(n), currency)}</tspan>{/if}
                </text>
              </a>
            {:else}
              <text
                x={labelX(n)}
                y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
                text-anchor={anchor(n)}
                dominant-baseline="middle"
              >
                {caption(n)}
                {#if n.column !== 1}<tspan class="num value"> {formatWhole(total(n), currency)}</tspan>{/if}
              </text>
            {/if}
            <title>{n.label}: {formatWhole(total(n), currency)}</title>
          </g>
        {/each}
      </g>
    </svg>
  {:else}
    <table class="flows">
      <caption class="sr-only">{label}</caption>
      <tbody>
        {#each links as l (l.source + '→' + l.target)}
          <tr>
            <td
              ><i class="swatch" style="--c: {colorVar(byKey.get(l.source)?.colorKey)}"></i>{byKey.get(
                l.source,
              )?.label}</td
            >
            <td class="arrow" aria-hidden="true">→</td>
            <td
              ><i class="swatch" style="--c: {colorVar(byKey.get(l.target)?.colorKey)}"></i>{byKey.get(
                l.target,
              )?.label}</td
            >
            <td class="num amount">{formatWhole(l.amountMinor, currency)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
  {#if !narrow && graph}
    <button type="button" class="toggle" aria-pressed={showTable} onclick={() => (showTable = !showTable)}
      >{tableLabel}</button
    >
  {/if}
</div>

<style>
  .sankey {
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
  .links path {
    fill: none;
    opacity: 0.38;
    transition: opacity 160ms ease;
  }
  .links path:hover {
    opacity: 0.7;
  }
  .links path.dim {
    opacity: 0.08;
  }
  .nodes g {
    transition: opacity 160ms ease;
  }
  .nodes g.dim {
    opacity: 0.3;
  }
  .nodes text {
    fill: var(--ink);
    font-weight: 600;
    /* A surface halo keeps a label readable where it crosses a link. */
    paint-order: stroke;
    stroke: var(--surface);
    stroke-width: 4px;
    stroke-linejoin: round;
  }
  .nodes .value {
    fill: var(--ink-faint);
    font-weight: 500;
  }
  .nodes a text {
    text-decoration: none;
  }
  .nodes a:hover text,
  .nodes a:focus-visible text {
    text-decoration: underline;
  }
  .flows {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-micro);
  }
  .flows td {
    padding: 6px 4px;
    border-bottom: 1px solid var(--line);
    vertical-align: middle;
  }
  .flows .arrow {
    color: var(--ink-faint);
    text-align: center;
    width: 24px;
  }
  .flows .amount {
    text-align: right;
    white-space: nowrap;
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
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  @media (prefers-reduced-motion: reduce) {
    .links path,
    .nodes g {
      transition: none;
    }
  }
</style>
