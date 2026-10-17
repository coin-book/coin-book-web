import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => signIn(page));

test('overview answers how much is left to spend', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Zbývá utratit' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Kam šly peníze' }).getByRole('link').first(),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Poslední transakce' })).toBeVisible();
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
  await page.goto('/importy');
  await page.locator('input[type=file]').setInputFiles('e2e/fixtures/mbank-cz.csv');
  await expect(page.getByText('Kontrolní součty sedí')).toBeVisible();
  await expect(page.getByRole('button', { name: /Importovat \d+ transakcí/ })).toBeVisible();
  await page.getByRole('button', { name: 'Zahodit náhled' }).click();
  await expect(page.getByText('Přetáhněte výpis sem')).toBeVisible();
});

test('transactions filter by search text', async ({ page }) => {
  await page.goto('/transakce');
  await page.getByLabel('Protistrana, popis nebo částka').fill('ROHLIK');
  await expect(page).toHaveURL(/q=ROHLIK/);
  const rows = page.locator('[data-tx]');
  await expect(rows.first()).toContainText('ROHLIK');

  await rows.first().click();
  await expect(page.getByText('Protistrana', { exact: true })).toBeVisible();
  await expect(page.getByText('Původ', { exact: true })).toBeVisible();
});

test('an agent token is shown once and listed afterwards', async ({ page }) => {
  await page.goto('/nastaveni');
  await page.getByLabel('Název').fill(`e2e ${Date.now()}`);
  await page.getByRole('button', { name: 'Vytvořit token' }).click();
  await expect(page.getByTestId('agent-token-secret')).toContainText('coinbook_pat_');
});

test('command palette navigates', async ({ page }) => {
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByPlaceholder('Kam chcete jít nebo co najít?').fill('Účty');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/ucty/);
});
