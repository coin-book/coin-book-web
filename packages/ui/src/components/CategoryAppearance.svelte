<script lang="ts">
  import { colorVar } from '@coin-book/core/colors';
  import { t } from '@coin-book/core/i18n';
  import Icon from './Icon.svelte';

  type Props = { colorKey: string; icon: string };

  let { colorKey = $bindable(), icon = $bindable() }: Props = $props();
  const uid = $props.id();

  // Every key needs a --cat-* token in theme.css; brand, over and warn hues stay reserved.
  const colorKeys = [
    'chrpa',
    'laguna',
    'smaragd',
    'limeta',
    'slunecnice',
    'mandarinka',
    'malina',
    'ametyst',
    'kakao',
    'bridlice',
    'income',
  ];
  const icons = [
    'house',
    'lightning',
    'shopping-cart',
    'shopping-bag',
    't-shirt',
    'gift',
    'fork-knife',
    'coffee',
    'wine',
    'car',
    'gas-pump',
    'bus',
    'train',
    'bicycle',
    'airplane',
    'heartbeat',
    'pill',
    'first-aid',
    'barbell',
    'baby',
    'graduation-cap',
    'book-open',
    'paw-print',
    'dog',
    'ticket',
    'film-slate',
    'music-notes',
    'game-controller',
    'television',
    'palette',
    'tree',
    'device-mobile',
    'wrench',
    'receipt',
    'briefcase',
    'money',
    'piggy-bank',
    'hand-heart',
    'arrow-down-left',
    'dots-three',
  ];
</script>

<fieldset class="swatches">
  <legend>{t('categories.color')}</legend>
  {#each colorKeys as key (key)}
    <label class="swatch" style="--c: {colorVar(key)}">
      <input type="radio" name="color-{uid}" value={key} bind:group={colorKey} />
      <span aria-hidden="true"></span>
      <span class="sr-only">{key}</span>
    </label>
  {/each}
</fieldset>

<fieldset class="icons" style="--c: {colorVar(colorKey)}">
  <legend>{t('categories.icon')}</legend>
  {#each icons as name (name)}
    <label class="glyph" title={name}>
      <input type="radio" name="icon-{uid}" value={name} bind:group={icon} />
      <Icon {name} size={20} weight={icon === name ? 'fill' : 'regular'} />
    </label>
  {/each}
</fieldset>

<style>
  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
  }
  legend {
    padding: 0;
    margin-bottom: 6px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-soft);
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .swatch {
    position: relative;
    cursor: pointer;
  }
  .swatch span[aria-hidden] {
    display: block;
    width: 26px;
    height: 26px;
    border-radius: 999px;
    background: var(--c);
    transition: transform 120ms ease-out;
  }
  .swatch input:checked + span {
    box-shadow:
      0 0 0 3px var(--surface),
      0 0 0 5px var(--c);
    transform: scale(0.9);
  }
  .swatch input:focus-visible + span,
  .glyph:has(input:focus-visible) {
    outline: 2px solid var(--brand);
    outline-offset: 4px;
  }
  .glyph {
    position: relative;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    color: var(--ink-faint);
    cursor: pointer;
  }
  .glyph:hover {
    color: var(--ink);
    background: color-mix(in oklch, var(--ink) 5%, transparent);
  }
  .glyph:has(input:checked) {
    color: var(--c);
    background: color-mix(in oklch, var(--c) 18%, transparent);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
