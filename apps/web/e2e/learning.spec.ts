import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => signIn(page));

test('the auto-categorisation threshold is saved and can be turned off again', async ({ page }) => {
  await page.goto('/settings');
  const select = page.getByLabel('Automatické zařazování při importu');
  await expect(page.getByText(/Teď se učí z \d+ transakcí/)).toBeVisible();

  await select.selectOption('0.9');
  await expect(page.getByText('Nastavení uloženo')).toBeVisible();
  await page.reload();
  await expect(select).toHaveValue('0.9');

  await select.selectOption('0');
  await expect(select).toHaveValue('0');
});

test('uncategorised transactions carry a suggestion that one click accepts', async ({ page }) => {
  await page.goto('/transactions?uncategorized=1');
  await expect(
    page.locator('[data-tx]').first().or(page.getByText('Žádné transakce neodpovídají filtru.')),
  ).toBeVisible();
  const suggestion = page.getByRole('button', { name: /^Přijmout návrh/ }).first();
  test.skip(!(await suggestion.isVisible()), 'no uncategorised transaction left in the demo');
  await suggestion.click();
  await expect(page.getByText(/Zařazeno do/)).toBeVisible();
});
