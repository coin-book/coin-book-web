import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => signIn(page));

test('a payment can be marked as a transfer to an own account and back', async ({ page }) => {
  const account = `Spořák ${Date.now()}`;
  await page.goto('/ucty');
  await page.getByRole('button', { name: 'Nový účet' }).click();
  await page.getByLabel('Název').fill(account);
  await page.getByRole('button', { name: 'Založit účet' }).click();
  await expect(page.getByText(account)).toBeVisible();

  await page.goto('/transakce?nezarazene=1');
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
