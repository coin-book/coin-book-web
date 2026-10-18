import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

// One sign-in for the whole flow: the suite as a whole stays under the API's login rate limit.
test('the demo portfolio, an instrument and its Yahoo symbol', async ({ page }) => {
  await signIn(page);

  await test.step('positions, the time test and realised gains', async () => {
    await page.getByRole('link', { name: 'Investice' }).first().click();
    await expect(page).toHaveURL(/\/investice$/);
    const aapl = page.getByTestId('position').and(page.locator('[data-isin="US0378331005"]'));
    await expect(aapl).toContainText('AAPL');
    await expect(aapl).toContainText('11');
    await expect(aapl).toContainText('od 16. 1. 2029');
    await expect(page.getByTestId('realized-year').and(page.locator('[data-year="2026"]'))).toBeVisible();
  });

  await test.step('open lots and a symbol of ones own', async () => {
    await page.getByRole('link', { name: 'AAPL' }).first().click();
    await expect(page.getByRole('heading', { name: 'AAPL', level: 1 })).toBeVisible();
    await expect(page.getByTestId('open-lot')).toHaveCount(2);
    await expect(page.getByTestId('open-lot').first()).toContainText('Osvobozeno');

    const symbol = page.getByLabel('Symbol Yahoo Finance');
    await expect(symbol).toHaveValue('AAPL');
    await symbol.fill('not a symbol');
    await page.getByRole('button', { name: 'Uložit' }).click();
    await expect(page.getByText('Tohle není platný symbol Yahoo Finance.')).toBeVisible();
    await symbol.fill('AAPL');
    await page.getByRole('button', { name: 'Uložit' }).click();
    await expect(page.getByText('Symbol uložen, ceny se stahují.')).toBeVisible();
  });
});
