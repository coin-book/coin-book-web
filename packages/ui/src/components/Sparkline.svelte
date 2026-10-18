<script lang="ts">
  type Props = {
    /** Oldest first. Fewer than two values draw nothing. */
    values: number[];
    label: string;
    width?: number;
    height?: number;
  };

  let { values, label, width = 110, height = 30 }: Props = $props();

  const PAD = 2;

  const points = $derived.by(() => {
    if (values.length < 2) return '';
    const min = Math.min(...values);
    const span = Math.max(...values) - min || 1;
    return values
      .map((v, i) => {
        const x = PAD + (i / (values.length - 1)) * (width - 2 * PAD);
        const y = PAD + (1 - (v - min) / span) * (height - 2 * PAD);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });
  const rising = $derived(values.length > 1 && values[values.length - 1] >= values[0]);
</script>

{#if points}
  <svg
    class="spark"
    class:rising
    {width}
    {height}
    viewBox="0 0 {width} {height}"
    role="img"
    aria-label={label}
  >
    <polyline {points} />
  </svg>
{/if}

<style>
  .spark {
    display: block;
    overflow: visible;
  }
  polyline {
    fill: none;
    stroke: var(--loss);
    stroke-width: 1.75;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .rising polyline {
    stroke: var(--income);
  }
</style>
