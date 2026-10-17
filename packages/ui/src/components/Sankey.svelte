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

  // Gradient and filter ids must be unique per chart on the page.
  const uid = $props.id();

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

  function linkKey(l: L) {
    return nodeOf(l.source).key + '→' + nodeOf(l.target).key;
  }

  function gradientId(index: number) {
    return `${uid}-flow-${index}`;
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
      <defs>
        {#each graph.links as l, i (linkKey(l))}
          <linearGradient
            id={gradientId(i)}
            gradientUnits="userSpaceOnUse"
            x1={nodeOf(l.source).x1}
            x2={nodeOf(l.target).x0}
          >
            <stop offset="0%" stop-color={colorVar(nodeOf(l.source).colorKey)} />
            <stop offset="100%" stop-color={colorVar(nodeOf(l.target).colorKey)} />
          </linearGradient>
        {/each}
        <linearGradient id="{uid}-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.35" />
          <stop offset="40%" stop-color="#fff" stop-opacity="0" />
          <stop offset="100%" stop-color="#000" stop-opacity="0.15" />
        </linearGradient>
        <filter id="{uid}-lift" x="-50%" y="-10%" width="200%" height="130%">
          <feDropShadow class="shadow" dx="0" dy="2" stdDeviation="2.5" />
        </filter>
      </defs>
      <g class="links">
        {#each graph.links as l, i (linkKey(l))}
          {@const w = Math.max(1, l.width ?? 1)}
          <g
            role="presentation"
            class="link"
            class:dim={active !== null && !touches(l, active)}
            onmouseenter={() => (active = nodeOf(l.target).key)}
            onmouseleave={() => (active = null)}
          >
            <path class="band" d={path(l) ?? ''} stroke="url(#{gradientId(i)})" stroke-width={w} />
            <!-- Brighter cores inside the band make it read as a rounded tube. -->
            <path class="sheen" d={path(l) ?? ''} stroke-width={w * 0.6} />
            <path class="sheen" d={path(l) ?? ''} stroke-width={w * 0.25} />
            <title
              >{nodeOf(l.source).label} → {nodeOf(l.target).label}: {formatWhole(
                l.amountMinor,
                currency,
              )}</title
            >
          </g>
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
              filter="url(#{uid}-lift)"
            />
            <rect
              class="light"
              x={n.x0}
              y={n.y0}
              width={(n.x1 ?? 0) - (n.x0 ?? 0)}
              height={Math.max(2, (n.y1 ?? 0) - (n.y0 ?? 0))}
              rx="3"
              fill="url(#{uid}-light)"
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
  .link {
    opacity: 0.5;
    transition: opacity 160ms ease;
  }
  .link:hover {
    opacity: 0.85;
  }
  .link.dim {
    opacity: 0.1;
  }
  .link path {
    fill: none;
  }
  .link .sheen {
    stroke: #fff;
    stroke-opacity: 0.1;
    stroke-linecap: butt;
    pointer-events: none;
  }
  .light {
    pointer-events: none;
  }
  .shadow {
    flood-color: var(--ink);
    flood-opacity: 0.22;
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
    .link,
    .nodes g {
      transition: none;
    }
  }
</style>
