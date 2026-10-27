import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => signIn(page));

test('a payment can be marked as a transfer to an own account and back', async ({ page }) => {
  const account = `Spořák ${Date.now()}`;
  await page.goto('/accounts');
  await page.getByRole('button', { name: 'Nový účet' }).click();
  await page.getByLabel('Název').fill(account);
  await page.getByRole('button', { name: 'Založit účet' }).click();
  await expect(page.getByText(account)).toBeVisible();

  await page.goto('/transactions?uncategorized=1');
  const txId = await page.locator('[data-tx]').first().getAttribute('data-tx');
  const row = page.getByTestId('transaction-row').filter({ has: page.locator(`[data-tx="${txId}"]`) });
  await row.locator('[data-tx]').click();
  await row.getByRole('button', { name: 'Převod na vlastní účet' }).click();
  await row.getByLabel('Peníze šly na účet').selectOption({ label: account });
  await row.getByRole('checkbox').uncheck();
  await row.getByRole('button', { name: 'Označit jako převod' }).click();

  await expect(page.getByText(`Označeno jako převod, účet ${account}`)).toBeVisible();
  await expect(row.getByText(`Převod na ${account}`)).toBeVisible();

  await row.getByRole('button', { name: 'Není to převod' }).click();
  await expect(page.getByText('Transakce už není převod')).toBeVisible();
  await expect(row.getByText(`Převod na ${account}`)).toHaveCount(0);
});

test('the transfers filter lists only transfers', async ({ page }) => {
  await page.goto('/transactions?transfer=1');
  await expect(page.getByRole('button', { name: 'Druh transakcí: Převody' })).toBeVisible();
  const rows = page.getByTestId('transaction-row');
  await expect(rows.first()).toBeVisible();
  for (const row of await rows.all()) await expect(row.getByText(/Převod (na|z) /)).toBeVisible();
});

test('the exchanges filter keeps only currency exchanges', async ({ page }) => {
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Druh transakcí: Všechny transakce' }).click();
  await page.getByLabel('Výměny měn').check();
  await expect(page).toHaveURL(/operation=exchange/);
  const rows = page.getByTestId('transaction-row');
  await expect(rows.or(page.getByText('Žádné transakce neodpovídají filtru.')).first()).toBeVisible();
  for (const row of await rows.all()) await expect(row.getByText('Výměna měn')).toBeVisible();
});

test('a top-up is paired by hand, moved to another counterpart, and undone', async ({ page }) => {
  await page.goto('/transactions?q=DOBITI%20REVOLUT');
  const txId = await page.locator('[data-tx]').last().getAttribute('data-tx');
  const row = page.getByTestId('transaction-row').filter({ has: page.locator(`[data-tx="${txId}"]`) });
  const ambiguous = row.locator(`[data-tx="${txId}"]`);
  const counterparts = row.getByTestId('transfer-counterparts');

  await ambiguous.click();
  await row.getByRole('button', { name: 'Spárovat s platbou' }).click();
  await expect(counterparts.getByTestId('transfer-leg')).toHaveCount(2);
  await expect(counterparts.getByTestId('transfer-leg').first()).toContainText('doporučená');
  await counterparts.getByRole('button', { name: 'Spárovat' }).first().click();
  await expect(page.getByText(/^Spárováno s platbou na účtu [^;]+$/)).toBeVisible();
  await expect(row.getByText(/Převod na /)).toBeVisible();

  await ambiguous.click();
  await row.getByRole('button', { name: 'Změnit protistranu' }).click();
  await expect(counterparts.getByTestId('transfer-leg')).toHaveCount(1);
  await counterparts.getByRole('button', { name: 'Spárovat' }).click();
  await expect(page.getByText(/uvolněné platby čekají na zařazení/)).toBeVisible();

  await ambiguous.click();
  await row.getByRole('button', { name: 'Není to převod' }).click();
  await expect(page.getByText('Transakce už není převod')).toBeVisible();
  await expect(row.getByRole('button', { name: 'Spárovat s platbou' })).toBeVisible();
});
