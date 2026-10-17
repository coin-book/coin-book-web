<script lang="ts">
  import BudgetBullets from '@coin-book/ui/BudgetBullets.svelte';
  import Button from '@coin-book/ui/Button.svelte';
  import CategoryChip from '@coin-book/ui/CategoryChip.svelte';
  import CategoryIcon from '@coin-book/ui/CategoryIcon.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import CategoryBars from '@coin-book/ui/CategoryBars.svelte';

  const base = ['ink', 'canvas', 'surface', 'brand', 'income', 'over', 'warn', 'transfer'];
  const hues = [
    ['mandarinka', 'car'],
    ['malina', 'fork-knife'],
    ['ametyst', 'ticket'],
    ['chrpa', 'house'],
    ['laguna', 'heartbeat'],
    ['smaragd', 'shopping-cart'],
    ['limeta', 'baby'],
    ['slunecnice', 'shopping-bag'],
    ['kakao', 'receipt'],
    ['bridlice', 'dots-three'],
  ];
  const ribbon = hues.slice(0, 7).map(([key], i) => ({
    key,
    label: key,
    colorKey: key,
    amountMinor: (9 - i) * 120000,
  }));
</script>

<svelte:head><title>Design · coin-book</title></svelte:head>

<h1 class="display title">Katalog</h1>

<section class="panel">
  <h2>Základ</h2>
  <div class="swatches">
    {#each base as token (token)}
      <div class="swatch"><span style="background: var(--{token})"></span><code>--{token}</code></div>
    {/each}
  </div>
</section>

<section class="panel">
  <h2>Kategorie</h2>
  <div class="hues">
    {#each hues as [key, icon] (key)}
      <div class="hue">
        <CategoryIcon colorKey={key} {icon} size={40} />
        <CategoryChip colorKey={key} label={key} />
        <CategoryChip colorKey={key} label={key} muted />
      </div>
    {/each}
  </div>
</section>

<section class="panel">
  <h2>Částky</h2>
  <div class="amounts">
    <MoneyAmount amount={{ minor: 1482000, currency: 'CZK' }} size="hero" whole />
    <MoneyAmount amount={{ minor: 6200000, currency: 'CZK' }} size="lg" signed />
    <MoneyAmount amount={{ minor: -124900, currency: 'CZK' }} />
    <MoneyAmount amount={{ minor: -350, currency: 'EUR' }} size="sm" />
  </div>
</section>

<section class="panel">
  <h2>Kam šly peníze</h2>
  <CategoryBars bars={ribbon} currency="CZK" label="Ukázka" />
</section>

<section class="panel">
  <h2>Rozpočty</h2>
  <BudgetBullets
    label="Ukázka"
    currency="CZK"
    elapsed={0.52}
    lines={[
      {
        key: 'potraviny',
        label: 'Potraviny',
        colorKey: 'smaragd',
        plannedMinor: 900000,
        spentMinor: 624000,
        status: 'ahead_of_pace',
      },
      {
        key: 'venku',
        label: 'Jídlo venku',
        colorKey: 'malina',
        plannedMinor: 300000,
        spentMinor: 338000,
        status: 'over',
      },
      {
        key: 'doprava',
        label: 'Doprava',
        colorKey: 'mandarinka',
        plannedMinor: 250000,
        spentMinor: 110000,
        status: 'on_track',
      },
    ]}
  />
</section>

<section class="panel">
  <h2>Zaškrtávátka</h2>
  <div class="checks">
    <label><input type="checkbox" checked /> Uložit jako pravidlo pro ROHLIK.CZ</label>
    <label><input type="checkbox" /> Jen nezařazené</label>
    <label><input type="checkbox" disabled /> Nedostupné</label>
  </div>
</section>

<section class="panel">
  <h2>Tlačítka</h2>
  <div class="buttons">
    <Button icon="upload-simple">Nahrát výpis</Button>
    <Button variant="quiet">Převzít z minulého měsíce</Button>
    <Button variant="danger">Importovat přesto</Button>
    <Button variant="ghost">Přeskočit</Button>
  </div>
</section>

<style>
  .title {
    margin: 0 0 20px;
    font-size: var(--text-headline);
  }
  .panel {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 22px 24px;
    margin-bottom: 18px;
  }
  h2 {
    margin: 0 0 14px;
    font-size: var(--text-body);
    color: var(--ink-soft);
  }
  .swatches,
  .hues,
  .amounts,
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    align-items: center;
  }
  .swatch {
    display: grid;
    gap: 6px;
    justify-items: center;
    font-size: 12px;
  }
  .swatch span {
    width: 64px;
    height: 44px;
    border-radius: 12px;
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .checks {
    display: flex;
    flex-wrap: wrap;
    gap: 22px;
  }
  .checks label {
    display: flex;
    align-items: center;
    gap: 9px;
    cursor: pointer;
  }
  .hue {
    display: grid;
    gap: 8px;
    justify-items: start;
  }
</style>
