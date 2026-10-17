<script lang="ts">
  import { moneyParts } from '@coin-book/core/money';
  import type { Amount } from '@coin-book/core/types';

  type Props = {
    amount: Amount;
    /** Show "+" on positive amounts and colour them as income. */
    signed?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'hero';
    /** Drop the haléře, for budgets and headline numbers. */
    whole?: boolean;
    class?: string;
  };

  let { amount, signed = false, size = 'md', whole = false, class: className = '' }: Props = $props();

  const parts = $derived(moneyParts(amount, { signed }));
  const isIncome = $derived(signed && amount.minor > 0);
</script>

<span class="money num size-{size} {className}" class:income={isIncome}>
  {#if parts.sign}<span class="sign" class:minus={parts.sign !== '+'}>{parts.sign}</span>{/if}<span
    class="whole">{parts.whole}</span
  >{#if parts.fraction && !whole}<span class="fraction">,{parts.fraction}</span>{/if}<span class="currency"
    >{parts.currency}</span
  >
</span>

<style>
  .money {
    white-space: nowrap;
    font-weight: 600;
    color: inherit;
  }
  .income {
    color: var(--income);
  }
  .income.size-lg,
  .income.size-hero {
    text-shadow: var(--glow-text);
  }
  /* Figtree draws − and + with 120 and 85 units of sidebearing against 50 on digits; pull the number in. */
  .sign {
    margin-right: -0.035em;
  }
  .sign.minus {
    margin-right: -0.07em;
  }
  .fraction {
    font-size: 0.72em;
    font-weight: 500;
    opacity: 0.62;
  }
  .currency {
    font-size: 0.7em;
    font-weight: 500;
    margin-left: 0.28em;
    opacity: 0.62;
  }
  .size-sm {
    font-size: var(--text-micro);
  }
  .size-md {
    font-size: var(--text-body);
  }
  .size-lg {
    font-size: var(--text-title);
    font-family: var(--font-display);
    letter-spacing: -0.02em;
  }
  .size-hero {
    font-size: clamp(36px, 7vw, var(--text-hero));
    font-family: var(--font-display);
    font-weight: 700;
    letter-spacing: -0.035em;
    line-height: 1;
  }
</style>
