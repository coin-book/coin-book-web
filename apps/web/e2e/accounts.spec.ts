import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => signIn(page));

test('a generic CSV asks where it belongs and can create the account', async ({ page }) => {
  const run = Date.now();
  const csv = `datum;castka;mena;popis;kategorie\n2026-10-14;-120,00;CZK;Trafika ${run};Nákupy\n`;
  await page.goto('/imports');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: `pokladna-${run}.csv`, mimeType: 'text/csv', buffer: Buffer.from(csv) });

  await expect(page.getByText('Soubor neuvádí účet')).toBeVisible();
  await page.getByPlaceholder('Název nového účtu').fill(`Peněženka ${run}`);
  await page.getByRole('button', { name: /Importovat 1 transakcí/ }).click();
  await expect(page.getByText('Naimportováno 1 transakcí')).toBeVisible();

  await page.goto('/accounts');
  await expect(page.getByText(`Peněženka ${run}`)).toBeVisible();
});

test('two accounts in one currency can be merged', async ({ page }) => {
  const run = Date.now();
  await page.goto('/accounts');
  for (const name of [`Zdroj ${run}`, `Cíl ${run}`]) {
    await page.getByRole('button', { name: 'Nový účet' }).click();
    await page.getByLabel('Název').fill(name);
    await page.getByRole('button', { name: 'Založit účet' }).click();
    await expect(page.getByText(name)).toBeVisible();
  }

  const source = page.getByTestId('account-card').filter({ hasText: `Zdroj ${run}` });
  await source.getByRole('button', { name: 'Sloučit do…' }).click();
  await source.getByLabel('Sloučit do účtu').selectOption({ label: `Cíl ${run}` });
  page.once('dialog', (d) => d.accept());
  await source.getByRole('button', { name: 'Sloučit do účtu' }).click();

  await expect(page.getByText(/Sloučeno, přesunuto 0 transakcí/)).toBeVisible();
  await expect(page.getByText(`Zdroj ${run}`)).toHaveCount(0);
});

test('the current balance can be typed in and the opening balance follows', async ({ page }) => {
  const account = `Hotovost ${Date.now()}`;
  await page.goto('/accounts');
  await page.getByRole('button', { name: 'Nový účet' }).click();
  await page.getByLabel('Název').fill(account);
  await page.getByRole('button', { name: 'Založit účet' }).click();
  const card = page.getByTestId('account-card').filter({ hasText: account });
  await expect(card).toBeVisible();

  await card.getByRole('button', { name: 'Upravit' }).click();
  await card.getByLabel(/Aktuální zůstatek/).fill('1500,50');
  await expect(card.getByLabel(/Počáteční zůstatek/)).toHaveValue('1500,5');
  await card.getByRole('button', { name: 'Uložit' }).click();
  await expect(page.getByText('Účet uložen')).toBeVisible();

  await card.getByRole('button', { name: 'Upravit' }).click();
  await expect(card.getByLabel(/Aktuální zůstatek/)).toHaveValue('1500,5');
});
