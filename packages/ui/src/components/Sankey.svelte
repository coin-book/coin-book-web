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
  import { Chart, Sankey, Tooltip } from 'layerchart/svg';
  import type { SankeyLink as D3Link, SankeyNode as D3Node } from 'd3-sankey';
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

  type Extra = { amountMinor: number };
  type N = D3Node<SankeyNode, Extra>;
  type L = D3Link<SankeyNode, Extra>;
  type Hovered = { node: N } | { link: L };

  const NODE_WIDTH = 14;
  const NODE_PADDING = 34;
  const ROW_HEIGHT = 52;
  const MIN_HEIGHT = 260;
  // Room above the plot for the account names, which sit on top of their nodes.
  const TOP_BAND = 26;
  const LABEL_SHARE = 0.25;
  const LABEL_MAX_WIDTH = 220;
  const LABEL_MAX_CHARS = 24;
  const ACCOUNT_LABEL_MAX_CHARS = 34;
  const NARROW = 560;
  const ACCOUNT_COLUMN = 1;

  let width = $state(720);
  let active = $state<string | null>(null);
  let showTable = $state(false);

  const narrow = $derived(width < NARROW);
  const labelWidth = $derived(Math.min(LABEL_MAX_WIDTH, width * LABEL_SHARE));
  const rows = $derived(Math.max(...[0, 1, 2].map((c) => nodes.filter((n) => n.column === c).length)));
  const height = $derived(Math.max(MIN_HEIGHT, rows * ROW_HEIGHT + TOP_BAND + 16));

  // LayerChart's Sankey lays the graph out in place, so it gets fresh copies.
  const data = $derived({
    nodes: nodes.map((n) => ({ ...n })),
    links: links.map((l) => ({
      source: l.source,
      target: l.target,
      value: l.amountMinor,
      amountMinor: l.amountMinor,
    })),
  });

  const byKey = $derived(new Map(nodes.map((n) => [n.key, n])));

  /** Shares are of the money that came in, or of what went out when nothing came in. */
  function shareBase(laidOut: N[]) {
    const income = laidOut.filter((n) => n.column === 0).reduce((sum, n) => sum + (n.value ?? 0), 0);
    return income || laidOut.filter((n) => n.column === 2).reduce((sum, n) => sum + (n.value ?? 0), 0);
  }

  function nodeOf(end: L['source']): N {
    return end as N;
  }

  function linkKey(l: L) {
    return nodeOf(l.source).key + '→' + nodeOf(l.target).key;
  }

  function touches(l: L, key: string) {
    return nodeOf(l.source).key === key || nodeOf(l.target).key === key;
  }

  function connected(n: N, key: string, laidOut: L[]) {
    return n.key === key || laidOut.some((l) => touches(l, key) && touches(l, n.key));
  }

  function accountEndIsSource(l: L) {
    return nodeOf(l.source).column === ACCOUNT_COLUMN;
  }

  /** The band belongs to the category end, not the account: a flow is coloured by what it is. */
  function bandColor(l: L) {
    return colorVar((accountEndIsSource(l) ? nodeOf(l.target) : nodeOf(l.source)).colorKey);
  }

  function nodeColor(n: N) {
    return n.column === ACCOUNT_COLUMN ? 'var(--sankey-account)' : colorVar(n.colorKey);
  }

  /** A filled band between the two nodes; unlike a thick stroke it ends flush with them. */
  function band(l: L) {
    const x0 = nodeOf(l.source).x1 ?? 0;
    const x1 = nodeOf(l.target).x0 ?? 0;
    const half = (l.width ?? 1) / 2;
    const ys = l.y0 ?? 0;
    const yt = l.y1 ?? 0;
    const mid = (x0 + x1) / 2;
    return [
      `M${x0},${ys - half}`,
      `C${mid},${ys - half} ${mid},${yt - half} ${x1},${yt - half}`,
      `L${x1},${yt + half}`,
      `C${mid},${yt + half} ${mid},${ys + half} ${x0},${ys + half}`,
      'Z',
    ].join(' ');
  }

  function short(text: string, max: number) {
    return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
  }

  function middleY(n: N) {
    return ((n.y0 ?? 0) + (n.y1 ?? 0)) / 2;
  }
</script>

<div class="sankey" bind:clientWidth={width}>
  {#if !narrow && !showTable && links.length > 0}
    <div class="plot" style="height: {height}px">
      <Chart
        {data}
        flatData={[]}
        padding={{ top: TOP_BAND, bottom: 8, left: labelWidth, right: labelWidth }}
        tooltipContext={{ mode: 'manual' }}
        props={{ svg: { role: 'img', 'aria-label': label } }}
      >
        {#snippet marks({ context })}
          <Sankey
            nodeId={(d: SankeyNode) => d.key}
            nodeAlign={(n) => (n as N).column}
            nodeWidth={NODE_WIDTH}
            nodePadding={NODE_PADDING}
            nodeSort={() => 0}
          >
            {#snippet children({ nodes: laidOutNodes, links: laidOutLinks })}
              {@const ns = laidOutNodes as unknown as N[]}
              {@const ls = laidOutLinks as unknown as L[]}
              {@const base = shareBase(ns)}
              <defs>
                {#each ls as l, i (linkKey(l))}
                  <!-- Full colour at the category end, fading towards the account the flow passes. -->
                  <linearGradient
                    id="{uid}-band-{i}"
                    gradientUnits="userSpaceOnUse"
                    x1={nodeOf(l.source).x1}
                    x2={nodeOf(l.target).x0}
                  >
                    <stop
                      offset="0%"
                      stop-color={bandColor(l)}
                      stop-opacity={accountEndIsSource(l) ? 0.28 : 0.7}
                    />
                    <stop
                      offset="100%"
                      stop-color={bandColor(l)}
                      stop-opacity={accountEndIsSource(l) ? 0.7 : 0.28}
                    />
                  </linearGradient>
                {/each}
                <linearGradient id="{uid}-light" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#fff" stop-opacity="0.4" />
                  <stop offset="55%" stop-color="#fff" stop-opacity="0" />
                  <stop offset="100%" stop-color="#000" stop-opacity="0.18" />
                </linearGradient>
                <filter id="{uid}-lift" x="-60%" y="-10%" width="220%" height="130%">
                  <feDropShadow class="shadow" dx="0" dy="2" stdDeviation="3" />
                </filter>
              </defs>

              <g class="links">
                {#each ls as l, i (linkKey(l))}
                  <path
                    role="presentation"
                    class="band"
                    class:dim={active !== null && !touches(l, active)}
                    class:lit={active !== null && touches(l, active)}
                    d={band(l)}
                    fill="url(#{uid}-band-{i})"
                    onpointermove={(e) => {
                      active = accountEndIsSource(l) ? nodeOf(l.target).key : nodeOf(l.source).key;
                      context.tooltip.show(e, { link: l } satisfies Hovered);
                    }}
                    onpointerleave={() => {
                      active = null;
                      context.tooltip.hide();
                    }}
                  />
                {/each}
              </g>

              <g class="nodes">
                {#each ns as n (n.key)}
                  {@const href = byKey.get(n.key)?.href}
                  {@const account = n.column === ACCOUNT_COLUMN}
                  {@const h = Math.max(3, (n.y1 ?? 0) - (n.y0 ?? 0))}
                  <g
                    role="group"
                    aria-label="{n.label}: {formatWhole(n.value ?? 0, currency)}"
                    class="node"
                    class:account
                    class:dim={active !== null && !connected(n, active, ls)}
                    onpointermove={(e) => {
                      active = n.key;
                      context.tooltip.show(e, { node: n } satisfies Hovered);
                    }}
                    onpointerleave={() => {
                      active = null;
                      context.tooltip.hide();
                    }}
                    onfocusin={() => (active = n.key)}
                    onfocusout={() => (active = null)}
                  >
                    <rect
                      x={n.x0}
                      y={n.y0}
                      width={NODE_WIDTH}
                      height={h}
                      rx="4"
                      fill={nodeColor(n)}
                      filter="url(#{uid}-lift)"
                    />
                    <rect
                      class="light"
                      x={n.x0}
                      y={n.y0}
                      width={NODE_WIDTH}
                      height={h}
                      rx="4"
                      fill="url(#{uid}-light)"
                    />

                    <svelte:element this={href ? 'a' : 'g'} {href} class="caption">
                      {#if account}
                        <text
                          class="name"
                          x={(n.x0 ?? 0) + NODE_WIDTH / 2}
                          y={(n.y0 ?? 0) - 9}
                          text-anchor="middle"
                        >
                          {short(n.label, ACCOUNT_LABEL_MAX_CHARS)}
                        </text>
                      {:else}
                        {@const x = n.column === 0 ? (n.x0 ?? 0) - 10 : (n.x1 ?? 0) + 10}
                        {@const anchor = n.column === 0 ? 'end' : 'start'}
                        <text class="name" {x} y={middleY(n) - 2} text-anchor={anchor}
                          >{short(n.label, LABEL_MAX_CHARS)}</text
                        >
                        <text class="value num" {x} y={middleY(n) + 13} text-anchor={anchor}>
                          {formatWhole(n.value ?? 0, currency)}{#if n.column !== 0 && base > 0}<tspan
                              class="share">{' · '}{Math.round(((n.value ?? 0) / base) * 100)}&nbsp;%</tspan
                            >{/if}
                        </text>
                      {/if}
                    </svelte:element>
                  </g>
                {/each}
              </g>
            {/snippet}
          </Sankey>
        {/snippet}

        {#snippet tooltip()}
          <Tooltip.Root>
            {#snippet children({ data: hovered }: { data: Hovered })}
              {#if 'link' in hovered}
                <Tooltip.Header
                  value="{nodeOf(hovered.link.source).label} → {nodeOf(hovered.link.target).label}"
                />
                <Tooltip.List>
                  <Tooltip.Item
                    label=""
                    value={formatWhole(hovered.link.amountMinor, currency)}
                    color={bandColor(hovered.link)}
                    valueAlign="right"
                  />
                </Tooltip.List>
              {:else}
                <Tooltip.Header value={hovered.node.label} />
                <Tooltip.List>
                  <Tooltip.Item
                    label=""
                    value={formatWhole(hovered.node.value ?? 0, currency)}
                    color={nodeColor(hovered.node)}
                    valueAlign="right"
                  />
                </Tooltip.List>
              {/if}
            {/snippet}
          </Tooltip.Root>
        {/snippet}
      </Chart>
    </div>
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
  {#if !narrow && links.length > 0}
    <button type="button" class="toggle" aria-pressed={showTable} onclick={() => (showTable = !showTable)}
      >{tableLabel}</button
    >
  {/if}
</div>

<style>
  .sankey {
    --sankey-account: color-mix(in oklch, var(--ink) 55%, var(--surface));
    width: 100%;
    position: relative;
  }
  .plot {
    width: 100%;
    font-size: var(--text-micro);
  }
  .plot :global(svg) {
    overflow: visible;
  }
  .band {
    transition: opacity 180ms ease;
  }
  .band.lit {
    opacity: 1;
    filter: saturate(1.15);
  }
  .band.dim {
    opacity: 0.18;
  }
  .node {
    transition: opacity 180ms ease;
  }
  .node.dim {
    opacity: 0.35;
  }
  .light {
    pointer-events: none;
  }
  .shadow {
    flood-color: var(--ink);
    flood-opacity: 0.2;
  }
  text {
    /* A surface halo keeps a label readable where it crosses a band. */
    paint-order: stroke;
    stroke: var(--surface);
    stroke-width: 4px;
    stroke-linejoin: round;
  }
  .name {
    fill: var(--ink);
    font-weight: 600;
  }
  .account .name {
    fill: var(--ink-soft);
    letter-spacing: 0.01em;
  }
  .value {
    fill: var(--ink-soft);
    font-weight: 500;
  }
  .share {
    fill: var(--ink-faint);
  }
  .caption {
    text-decoration: none;
  }
  a.caption:hover .name,
  a.caption:focus-visible .name {
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
    .band,
    .node {
      transition: none;
    }
  }
</style>
