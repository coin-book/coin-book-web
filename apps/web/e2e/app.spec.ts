import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => signIn(page));

test('overview answers how much is left to spend', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Zbývá utratit' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Kam šly peníze' }).getByRole('link').first(),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Poslední transakce' })).toBeVisible();

  await page.goto('/prehled?mesic=2026-09');
  await expect(page).toHaveURL(/\/overview\?month=2026-09$/);
});

test('triage assigns by number key and moves to the next card', async ({ page }) => {
  await page.getByRole('link', { name: /K vyřešení/ }).click();
  const remaining = page.getByText(/Zbývá roztřídit \d+/);
  const done = page.getByText('Všechno je roztříděné');
  await expect(remaining.or(done)).toBeVisible();
  test.skip(await done.isVisible(), 'the demo queue is already empty');
  const before = Number((await remaining.textContent())!.match(/\d+/)![0]);

  await page.keyboard.press('1');

  // The saved rule may sort further transactions of the same counterparty at once.
  await expect(page.getByText(/Zařazeno do/)).toBeVisible();
  await expect
    .poll(async () => {
      if (await page.getByText('Všechno je roztříděné').isVisible()) return 0;
      return Number((await remaining.textContent())?.match(/\d+/)?.[0] ?? before);
    })
    .toBeLessThan(before);
});

test('budget shows a tube per planned category', async ({ page }) => {
  await page.getByRole('navigation', { name: 'coin-book' }).getByRole('link', { name: 'Rozpočet' }).click();
  await expect(page.getByRole('meter').first()).toBeVisible();
  await expect(page.getByText(/zbývá|přes o/).first()).toBeVisible();
});

test('import preview writes nothing until confirmed', async ({ page }) => {
  await page.goto('/imports');
  await page.locator('input[type=file]').setInputFiles('e2e/fixtures/mbank-cz.csv');
  await expect(page.getByText('Kontrolní součty sedí')).toBeVisible();
  await expect(page.getByRole('button', { name: /Importovat \d+ transakcí/ })).toBeVisible();
  await page.getByRole('button', { name: 'Zahodit náhled' }).click();
  await expect(page.getByText('Přetáhněte výpis sem')).toBeVisible();
});

test('transactions filter by search text', async ({ page }) => {
  await page.goto('/transactions');
  await page.getByLabel('Protistrana, popis nebo částka').fill('ROHLIK');
  await expect(page).toHaveURL(/q=ROHLIK/);
  const rows = page.locator('[data-tx]');
  await expect(rows.first()).toContainText('ROHLIK');

  await rows.first().click();
  await expect(page.getByText('Protistrana', { exact: true })).toBeVisible();
  await expect(page.getByText('Původ', { exact: true })).toBeVisible();
});

test('an agent token is shown once and listed afterwards', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('Název').fill(`e2e ${Date.now()}`);
  await page.getByRole('button', { name: 'Vytvořit token' }).click();
  await expect(page.getByTestId('agent-token-secret')).toContainText('coinbook_pat_');
  await expect(page.getByTestId('about')).toContainText(/Webová aplikace\s*dev/);
  await expect(page.getByTestId('about')).toContainText(/Server\s*\S+/);
});

test('command palette navigates', async ({ page }) => {
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByPlaceholder('Kam chcete jít nebo co najít?').fill('Účty');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/accounts/);
});

// One test for the overview's charts: the suite signs in once per test and stays under the login rate limit.
test('overview charts draw and open the transactions behind what was clicked', async ({ page }) => {
  await expect(page.getByTestId('net-worth')).toContainText('Čisté jmění dnes');
  await expect(page.getByRole('img', { name: 'Tok peněz' })).toBeVisible();

  // A bar's row, away from its caption link.
  const bars = page.getByRole('navigation', { name: 'Kam šly peníze' });
  const barsBox = (await bars.boundingBox())!;
  await page.mouse.click(barsBox.x + barsBox.width * 0.5, barsBox.y + 30);
  await expect(page).toHaveURL(/\/transactions\?category=[^&]+&from=\d{4}-\d{2}-01&to=/);
  await page.goBack();

  // A flow between an account and a category.
  await page.getByTestId('flows-panel').getByRole('link', { name: /→/ }).first().click({ force: true });
  await expect(page).toHaveURL(/\/transactions\?account=[^&]+(&category=[^&]+)?&from=/);
  await page.goBack();

  await page.getByTestId('flows-panel').getByRole('button', { name: 'Zobrazit jako tabulku' }).click();
  await expect(page.getByTestId('flows-panel').getByRole('table')).toBeVisible();

  await page.getByRole('tab', { name: 'Posledních dvanáct měsíců' }).click();
  await expect(page).toHaveURL(/chart=trend/);
  await expect(page.getByRole('img', { name: 'Posledních dvanáct měsíců' })).toBeVisible();

  // The bottom segment of the last month's column: its biggest category.
  await page.getByRole('tab', { name: 'Výdaje podle kategorií po měsících' }).click();
  const stacked = page.getByRole('img', { name: 'Výdaje podle kategorií po měsících' });
  await expect(stacked).toBeVisible();
  await stacked.scrollIntoViewIfNeeded();
  const stackBox = (await stacked.boundingBox())!;
  await page.mouse.click(stackBox.x + stackBox.width * 0.95, stackBox.y + stackBox.height * 0.8);
  await expect(page).toHaveURL(/\/transactions\?category=[^&]+&from=/);
});
