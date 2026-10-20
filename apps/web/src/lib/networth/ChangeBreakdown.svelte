<script lang="ts">
  import { t, type MessageKey } from '@coin-book/core/i18n';
  import { formatWhole } from '@coin-book/core/money';
  import { classColor, type RangeChange } from '@coin-book/core/networth';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';

  let { change, rangeLabel }: { change: RangeChange | null; rangeLabel: string } = $props();

  const CZK = 'CZK';
  const largest = $derived(Math.max(1, ...(change?.byClass ?? []).map((c) => Math.abs(c.changeMinor))));
  /** Bars grow from a centre axis only when something fell; otherwise from the left edge. */
  const diverging = $derived((change?.byClass ?? []).some((c) => c.changeMinor < 0));

  function barPosition(changeMinor: number) {
    const span = diverging ? 50 : 100;
    const width = `width: ${(Math.abs(changeMinor) / largest) * span}%`;
    if (!diverging) return `${width}; left: 0`;
    return changeMinor < 0 ? `${width}; right: 50%` : `${width}; left: calc(50% + 1px)`;
  }
</script>

<section class="panel" data-testid="net-worth-growth">
  <h2>{t('netWorth.growth')}</h2>
  <p class="quiet small">{t('netWorth.growthLead', { range: rangeLabel })}</p>
  {#if !change || (change.changeMinor === 0 && change.byClass.length === 0)}
    <p class="quiet">{t('netWorth.noChange')}</p>
  {:else}
    <MoneyAmount amount={{ minor: change.changeMinor, currency: CZK }} gain whole size="lg" />
    <dl class="sources">
      <div>
        <dt>{t('netWorth.saved')}</dt>
        <dd><MoneyAmount amount={{ minor: change.savedMinor, currency: CZK }} gain whole /></dd>
        <p class="quiet small">{t('netWorth.savedHint')}</p>
      </div>
      <div>
        <dt>{t('netWorth.otherChange')}</dt>
        <dd><MoneyAmount amount={{ minor: change.otherMinor, currency: CZK }} gain whole /></dd>
        <p class="quiet small">{t('netWorth.otherHint')}</p>
      </div>
    </dl>
    {#if change.byClass.length > 0}
      <h3>{t('netWorth.byClassChange')}</h3>
      <ul class="classes">
        {#each change.byClass as c (c.key)}
          <li title="{t(`netWorth.class.${c.key}` as MessageKey)}: {formatWhole(c.changeMinor, CZK)}">
            <span class="label">{t(`netWorth.class.${c.key}` as MessageKey)}</span>
            <span class="axis" class:diverging aria-hidden="true">
              <i
                style="background: var(--cat-{classColor[c.key] ?? 'bridlice'}); {barPosition(c.changeMinor)}"
              ></i>
            </span>
            <MoneyAmount amount={{ minor: c.changeMinor, currency: CZK }} gain whole />
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

<style>
  .panel {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  h2 {
    margin: 0;
    font-size: var(--text-body);
    font-weight: 650;
    color: var(--ink-soft);
  }
  h3 {
    margin: 14px 0 2px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-faint);
  }
  p {
    margin: 0;
  }
  .sources {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin: 8px 0 0;
  }
  .sources div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border-radius: 10px;
    background: color-mix(in oklch, var(--ink) 4%, transparent);
  }
  dt {
    font-size: var(--text-micro);
    font-weight: 600;
    color: var(--ink-soft);
  }
  dd {
    margin: 0;
    font-weight: 650;
  }
  .classes {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .classes li {
    display: grid;
    grid-template-columns: minmax(110px, 0.9fr) minmax(0, 1.4fr) minmax(96px, auto);
    align-items: center;
    gap: 10px;
    font-size: var(--text-micro);
  }
  .classes li :global(.money) {
    justify-self: end;
  }
  .axis {
    position: relative;
    height: 10px;
  }
  .axis.diverging::before {
    content: '';
    position: absolute;
    left: 50%;
    top: -3px;
    bottom: -3px;
    width: 1px;
    background: var(--line);
  }
  .axis i {
    position: absolute;
    top: 0;
    bottom: 0;
    min-width: 2px;
    border-radius: 4px;
  }
  .quiet {
    color: var(--ink-soft);
  }
  .small {
    font-size: var(--text-micro);
  }
  @media (max-width: 640px) {
    .sources {
      grid-template-columns: 1fr;
    }
  }
</style>
