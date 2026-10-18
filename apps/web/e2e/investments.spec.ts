import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

// One sign-in for the whole flow: the suite as a whole stays under the API's login rate limit.
test('the demo portfolio, an instrument and its Yahoo symbol', async ({ page }) => {
  await signIn(page);

  await test.step('positions, the time test and realised gains', async () => {
    await page.getByRole('link', { name: 'Investice' }).first().click();
    await expect(page).toHaveURL(/\/investments$/);
    const aapl = page.getByTestId('position').and(page.locator('[data-isin="US0378331005"]'));
    await expect(aapl).toContainText('AAPL');
    await expect(aapl).toContainText('11');
    await expect(aapl).toContainText('od 16. 1. 2029');
    await expect(page.getByTestId('kpis')).toContainText('Realizováno 2026');
    await page.getByRole('tab', { name: 'Realizované zisky' }).click();
    await expect(page).toHaveURL(/tab=realized/);
    await expect(page.getByTestId('realized-year').and(page.locator('[data-year="2026"]'))).toBeVisible();
    await page.getByRole('tab', { name: 'Test 3 let' }).click();
    await expect(page.getByTestId('time-test')).toContainText('od 16. 1. 2029');
    await page.getByRole('tab', { name: 'Pozice' }).click();
  });

  await test.step('positions grouped by account by default, by broker, or not at all', async () => {
    await expect(page.getByTestId('position-group')).toHaveCount(2);
    await page.getByRole('button', { name: 'Podle brokera' }).click();
    await expect(page).toHaveURL(/group=broker/);
    await expect(page.getByTestId('position-group')).toHaveCount(1);
    await page.getByRole('button', { name: 'Neseskupovat' }).click();
    await expect(page).toHaveURL(/group=none/);
    await expect(page.getByTestId('position-group')).toHaveCount(0);
    await page.getByRole('button', { name: 'Podle účtu' }).click();
    await expect(page).not.toHaveURL(/group/);
    await expect(page.getByTestId('position-group')).toHaveCount(2);
  });

  await test.step('open lots and a symbol of ones own', async () => {
    await page.getByRole('link', { name: 'AAPL' }).first().click();
    await expect(page.getByRole('heading', { name: 'AAPL', level: 1 })).toBeVisible();
    await expect(page.getByTestId('open-lot')).toHaveCount(2);
    await expect(page.getByTestId('instrument-facts')).toContainText('Moje obchody');
    await expect(page.getByTestId('instrument-facts')).toContainText(/Poprvé koupeno\s*2. 3. 2022/);
    await expect(page.getByTestId('instrument-facts')).toContainText(
      /Realizovaný zisk\s*\+4\s149\s*Kč\s*\+32,2\s%/,
    );
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
