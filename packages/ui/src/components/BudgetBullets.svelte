<script lang="ts" module>
  export type BudgetBullet = {
    key: string;
    label: string;
    colorKey: string;
    plannedMinor: number;
    spentMinor: number;
    status: 'on_track' | 'ahead_of_pace' | 'over';
    href?: string;
  };
</script>

<script lang="ts">
  import { BarChart, Tooltip } from 'layerchart/svg';
  import { colorVar } from '@coin-book/core/colors';
  import { t } from '@coin-book/core/i18n';
  import { formatWhole } from '@coin-book/core/money';

  type Props = {
    lines: BudgetBullet[];
    currency: string;
    label: string;
    /** Share of the month gone (0–1); null hides the pace marker. */
    elapsed: number | null;
  };

  let { lines, currency, label, elapsed }: Props = $props();

  // Each row is a caption line (name left, spent of plan right) over a full-width bullet.
  const ROW_HEIGHT = 50;
  const BAR_HEIGHT = 12;
  const CAPTION_OFFSET = 16;
  const PADDING = { top: 0, right: 0, bottom: 0, left: 0 };

  let width = $state(0);

  // Every bullet is measured against its own plan (or its spending when that is larger), so a
  // small budget reads as clearly as a large one. Three stacked parts on a 0–1 scale: the spent
  // share of the plan in the category colour, the unspent rest as track, the excess in red.
  const rows = $derived(
    lines.map((l) => {
      const scale = Math.max(l.plannedMinor, l.spentMinor, 1);
      return {
        ...l,
        scale,
        within: Math.min(l.spentMinor, l.plannedMinor) / scale,
        rest: Math.max(l.plannedMinor - l.spentMinor, 0) / scale,
        over: Math.max(l.spentMinor - l.plannedMinor, 0) / scale,
      };
    }),
  );
  type Row = (typeof rows)[number];

  const height = $derived(rows.length * ROW_HEIGHT);
  const byKey = $derived(new Map(rows.map((r) => [r.key, r])));

  function remainingText(r: Row) {
    const remaining = r.plannedMinor - r.spentMinor;
    return remaining >= 0
      ? t('budget.left', { amount: formatWhole(remaining, currency) })
      : t('budget.overBy', { amount: formatWhole(-remaining, currency) });
  }
</script>

<div class="bullets" bind:clientWidth={width} style="height: {height}px">
  <BarChart
    data={rows}
    y="key"
    orientation="horizontal"
    xDomain={[0, 1]}
    series={[
      { key: 'within', value: 'within' },
      { key: 'rest', value: 'rest', color: 'var(--bullet-track)' },
      { key: 'over', value: 'over', color: 'var(--over)' },
    ]}
    seriesLayout="stack"
    c="key"
    cDomain={rows.map((r) => r.key)}
    cRange={rows.map((r) => colorVar(r.colorKey))}
    padding={PADDING}
    bandPadding={0}
    axis={false}
    grid={false}
    rule={false}
    props={{
      bars: { radius: 4, strokeWidth: 0, height: BAR_HEIGHT },
      svg: { role: 'img', 'aria-label': label },
    }}
  >
    {#snippet aboveMarks({ context })}
      {#each rows as r (r.key)}
        {@const barY = (context.yScale(r.key) ?? 0) + (context.yScale.bandwidth?.() ?? 0) / 2}
        {@const captionY = barY - CAPTION_OFFSET}
        <g
          role="meter"
          aria-label={r.label}
          aria-valuemin={0}
          aria-valuemax={r.plannedMinor}
          aria-valuenow={r.spentMinor}
          aria-valuetext="{formatWhole(r.spentMinor, currency)} / {formatWhole(r.plannedMinor, currency)}, {t(
            `budget.status.${r.status}`,
          )}"
          data-status={r.status}
        >
          <svelte:element this={r.href ? 'a' : 'g'} href={r.href} class="name-link">
            <text class="name" x={0} y={captionY}>{r.label}</text>
          </svelte:element>
          <text class="figures num" x={width} y={captionY} text-anchor="end">
            <tspan class="rest" class:over={r.over > 0}>{remainingText(r)}</tspan><tspan class="sep"
              >{'\u00a0·\u00a0'}</tspan
            >{formatWhole(r.spentMinor, currency)}<tspan class="planned"
              >{'\u00a0/\u00a0'}{formatWhole(r.plannedMinor, currency)}</tspan
            >
          </text>
          {#if elapsed !== null && r.plannedMinor > 0}
            <!-- Where spending would be today at an even pace through the month. -->
            {@const px = context.xScale((elapsed * r.plannedMinor) / r.scale)}
            <line
              class="pace"
              x1={px}
              x2={px}
              y1={barY - BAR_HEIGHT / 2 - 3}
              y2={barY + BAR_HEIGHT / 2 + 3}
            />
          {/if}
        </g>
      {/each}
    {/snippet}

    {#snippet tooltip()}
      <Tooltip.Root>
        {#snippet children({ data }: { data: Row })}
          {@const r = byKey.get(data.key) ?? data}
          <Tooltip.Header value={r.label} />
          <Tooltip.List>
            <Tooltip.Item
              label={t('budget.spent')}
              value={formatWhole(r.spentMinor, currency)}
              color={colorVar(r.colorKey)}
              valueAlign="right"
            />
            <Tooltip.Item
              label={t('budget.planned')}
              value={formatWhole(r.plannedMinor, currency)}
              color="var(--bullet-track)"
              valueAlign="right"
            />
            <Tooltip.Separator />
            <Tooltip.Item
              label={t(`budget.status.${r.status}`)}
              value={remainingText(r)}
              valueAlign="right"
            />
          </Tooltip.List>
        {/snippet}
      </Tooltip.Root>
    {/snippet}
  </BarChart>
</div>

<style>
  .bullets {
    --bullet-track: color-mix(in oklch, var(--ink) 9%, transparent);
    width: 100%;
    font-size: var(--text-micro);
  }
  .bullets :global(svg) {
    overflow: visible;
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
  .pace {
    stroke: var(--ink);
    stroke-width: 2;
    stroke-linecap: round;
  }
  .figures {
    fill: var(--ink);
    font-weight: 600;
  }
  .planned,
  .sep {
    fill: var(--ink-faint);
    font-weight: 500;
  }
  .rest {
    fill: var(--ink-soft);
    font-weight: 500;
  }
  .rest.over {
    fill: var(--over);
    font-weight: 600;
  }
</style>
