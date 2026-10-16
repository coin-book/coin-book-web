<script lang="ts">
  import { onMount } from 'svelte';
  import { colorVar } from '@coin-book/core/colors';
  import { formatWhole } from '@coin-book/core/money';
  import { t } from '@coin-book/core/i18n';
  import CategoryIcon from './CategoryIcon.svelte';

  type Props = {
    label: string;
    colorKey: string;
    icon: string;
    plannedMinor: number;
    spentMinor: number;
    currency: string;
    /** Share of the month gone (0–1); null hides the pace marker. */
    elapsed: number | null;
    status: 'on_track' | 'ahead_of_pace' | 'over';
    href?: string;
  };

  let { label, colorKey, icon, plannedMinor, spentMinor, currency, elapsed, status, href }: Props = $props();

  let filled = $state(false);
  onMount(() => requestAnimationFrame(() => (filled = true)));

  const scale = $derived(Math.max(plannedMinor, spentMinor, 1));
  const withinPct = $derived((Math.min(spentMinor, plannedMinor) / scale) * 100);
  const overflowPct = $derived((Math.max(spentMinor - plannedMinor, 0) / scale) * 100);
  const planPct = $derived((plannedMinor / scale) * 100);
  const pacePct = $derived(elapsed === null ? null : ((elapsed * plannedMinor) / scale) * 100);
  const remaining = $derived(plannedMinor - spentMinor);
</script>

<div class="tube-wrap">
  <svelte:element this={href ? 'a' : 'div'} {href} class="tube-row" data-status={status}>
    <div class="who">
      <CategoryIcon {colorKey} {icon} size={30} />
      <span class="label">{label}</span>
    </div>

    <div
      class="track"
      style="--c: {colorVar(colorKey)}"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={plannedMinor}
      aria-valuenow={spentMinor}
      aria-valuetext="{formatWhole(spentMinor, currency)} / {formatWhole(plannedMinor, currency)}, {t(
        `budget.status.${status}`,
      )}"
    >
      <div class="fill" style="width: {filled ? withinPct : 0}%"></div>
      {#if overflowPct > 0}
        <div class="overflow" style="left: {planPct}%; width: {filled ? overflowPct : 0}%"></div>
        <div class="plan-end" style="left: {planPct}%"></div>
      {/if}
      {#if pacePct !== null}
        <div class="pace" style="left: {pacePct}%" title={t('budget.today')}></div>
      {/if}
    </div>

    <div class="figures num">
      <span class="spent">{formatWhole(spentMinor, currency)}</span>
      <span class="planned">/ {formatWhole(plannedMinor, currency)}</span>
      <span class="rest">
        {remaining >= 0
          ? t('budget.left', { amount: formatWhole(remaining, currency) })
          : t('budget.overBy', { amount: formatWhole(-remaining, currency) })}
      </span>
    </div>
  </svelte:element>
</div>

<style>
  .tube-wrap {
    container-type: inline-size;
  }
  .tube-row {
    display: grid;
    grid-template-columns: minmax(150px, 1.1fr) minmax(140px, 2.4fr) minmax(150px, 1fr);
    align-items: center;
    gap: 18px;
    padding: 10px 0;
    color: inherit;
    text-decoration: none;
  }
  a.tube-row {
    border-radius: 12px;
  }
  a.tube-row:hover .label {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .label {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .track {
    position: relative;
    height: 14px;
    border-radius: 999px;
    background: color-mix(in oklch, var(--c) 14%, var(--surface));
  }
  [data-status='ahead_of_pace'] .track {
    box-shadow: 0 0 0 2px var(--warn);
  }
  .fill,
  .overflow {
    position: absolute;
    top: 0;
    bottom: 0;
    transition: width 700ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .fill {
    left: 0;
    border-radius: 999px;
    background: var(--c);
  }
  .overflow {
    border-radius: 0 999px 999px 0;
    background: repeating-linear-gradient(
      -45deg,
      var(--over) 0 6px,
      color-mix(in oklch, var(--over) 70%, var(--surface)) 6px 10px
    );
  }
  .plan-end {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    margin-left: -1px;
    background: var(--ink);
    opacity: 0.5;
  }
  .pace {
    position: absolute;
    top: -6px;
    bottom: -6px;
    width: 3px;
    margin-left: -1.5px;
    border-radius: 2px;
    background: var(--ink);
  }
  .figures {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: flex-end;
    column-gap: 6px;
    text-align: right;
  }
  .spent {
    font-weight: 700;
  }
  .planned {
    color: var(--ink-soft);
  }
  .rest {
    flex-basis: 100%;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  [data-status='over'] .rest {
    color: var(--over);
    font-weight: 600;
  }
  @container (max-width: 620px) {
    .tube-row {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'who' 'track' 'figures';
      row-gap: 8px;
    }
    .figures {
      justify-content: flex-start;
      text-align: left;
    }
    .rest {
      flex-basis: auto;
      margin-left: auto;
    }
    .who {
      grid-area: who;
    }
    .track {
      grid-area: track;
    }
    .figures {
      grid-area: figures;
    }
  }
</style>
