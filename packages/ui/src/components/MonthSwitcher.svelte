<script lang="ts">
  import { monthName, shiftMonth } from '@coin-book/core/dates';
  import { i18n, t } from '@coin-book/core/i18n';
  import Icon from './Icon.svelte';

  type Props = { month: string; hrefFor: (month: string) => string };

  let { month, hrefFor }: Props = $props();
</script>

<div class="switcher">
  <a href={hrefFor(shiftMonth(month, -1))} aria-label={t('month.prev')}
    ><Icon name="caret-left" weight="bold" /></a
  >
  <h1 class="display">{monthName(month, i18n.locale)}</h1>
  <a href={hrefFor(shiftMonth(month, 1))} aria-label={t('month.next')}
    ><Icon name="caret-right" weight="bold" /></a
  >
</div>

<style>
  .switcher {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  h1 {
    margin: 0 4px;
    font-size: var(--text-headline);
    min-width: 7.5ch;
  }
  a {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    color: var(--ink-soft);
  }
  a:hover {
    background: color-mix(in oklch, var(--ink) 7%, transparent);
    color: var(--ink);
  }
</style>
