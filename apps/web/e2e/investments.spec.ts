import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

// One sign-in for the whole flow: the suite as a whole stays under the API's login rate limit.
test('the demo wealth: portfolio, instrument, net worth, mortgage, Fingood', async ({ page }) => {
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

  await test.step('the menu groups money and wealth', async () => {
    const wealth = page.getByRole('list', { name: 'Majetek' });
    await expect(wealth.getByRole('link', { name: 'Čisté jmění' })).toBeVisible();
    await expect(wealth.getByRole('link', { name: 'Investice' })).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Peníze' }).getByRole('link', { name: 'Rozpočet' }),
    ).toBeVisible();
  });

  await test.step('the overview links its net worth to the new page', async () => {
    await page.getByRole('link', { name: 'Přehled' }).first().click();
    await expect(page.getByTestId('net-worth')).toContainText('dluhy');
    await page.getByTestId('net-worth').click();
    await expect(page).toHaveURL(/\/net-worth$/);
  });

  await test.step('assets less debts, by class, with a history and a reserve', async () => {
    await expect(page.getByRole('heading', { name: 'Čisté jmění', level: 1 })).toBeVisible();
    await expect(page.getByTestId('net-worth-kpis')).toContainText('Dluhy');
    await expect(page.getByTestId('reserve')).toContainText('měsíční výdaje');
    await expect(page.getByTestId('composition')).toContainText('Nemovitosti');
    await expect(page.getByTestId('net-worth-growth')).toContainText('Z úspor');
    const mortgage = page
      .getByTestId('net-worth-account')
      .filter({ has: page.getByRole('link', { name: 'Hypotéka', exact: true }) });
    await expect(mortgage).toContainText('fixace do');
    await expect(mortgage).toContainText('splaceno');
    await expect(page.getByTestId('equity')).toContainText('patří vám');
    await page.getByRole('button', { name: '5 let' }).click();
    await expect(page).toHaveURL(/range=60/);
    await page.getByRole('button', { name: 'Tabulka' }).click();
    await expect(page.getByTestId('net-worth-history').getByRole('table')).toBeVisible();
  });

  await test.step('a value entered by hand', async () => {
    const pension = page.getByTestId('net-worth-account').filter({ hasText: 'Penzijní spoření' });
    await pension.getByRole('button', { name: 'Zadat hodnotu' }).click();
    await pension.getByLabel(/Hodnota/).fill('151000');
    await pension.getByRole('button', { name: 'Uložit' }).click();
    await expect(page.getByText('Hodnota uložena')).toBeVisible();
    await expect(pension).toContainText('151 000');
  });

  await test.step('the mortgage: instalments split, tax overview and an extra payment', async () => {
    await page.getByRole('link', { name: 'Hypotéka', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Hypotéka', level: 1 })).toBeVisible();
    await expect(page.getByTestId('loan-kpis')).toContainText('Zbývá splatit');
    await expect(page.getByTestId('loan-rate')).toContainText('4,79');
    await expect(page.getByTestId('loan-payment').first()).toContainText('úrok');
    const payment = page.getByTestId('loan-payment').first();
    await payment.getByRole('button', { name: 'Upravit rozdělení' }).click();
    await payment.getByLabel(/Úrok/).fill('15000');
    await payment.getByRole('button', { name: 'Uložit' }).click();
    await expect(page.getByTestId('loan-payment').first()).toContainText('vlastní rozdělení');
    await page.getByTestId('loan-payment').first().getByRole('button', { name: 'Upravit rozdělení' }).click();
    await page.getByTestId('loan-payment').first().getByRole('button', { name: 'Podle kalendáře' }).click();
    await expect(page.getByTestId('loan-payment').first()).not.toContainText('vlastní rozdělení');
    await expect(page.getByTestId('loan-tax')).toContainText('150 000');
    await expect(page.getByTestId('loan-reserve')).toContainText('V rezervě');
    await expect(page.getByTestId('loan-reserve')).toContainText('Už ušetřila na úrocích');
    await page
      .getByTestId('prepayment')
      .getByLabel(/Částka/)
      .fill('200000');
    await page.getByRole('button', { name: 'Spočítat' }).click();
    await expect(page.getByTestId('prepayment')).toContainText('Kratší splácení');
    await expect(page.getByTestId('prepayment')).toContainText('Ušetříte');
    await page.getByRole('button', { name: 'Celý kalendář' }).click();
    await expect(page.getByTestId('loan-schedule')).toContainText('zaplaceno');
  });

  await test.step('Fingood: outstanding principal, the late loan and maturities', async () => {
    await page.getByRole('link', { name: 'Čisté jmění' }).first().click();
    await page.getByRole('link', { name: 'Fingood' }).click();
    await expect(page.getByTestId('p2p-kpis')).toContainText('Ohrožená jistina');
    await expect(page.getByTestId('p2p-loan')).toHaveCount(5);
    await expect(page.getByTestId('p2p-loan').and(page.locator('[data-loan="2300000104"]'))).toContainText(
      'zpoždění',
    );
    await page.getByLabel('Zobrazit i splacené').check();
    await expect(page.getByTestId('p2p-loan')).toHaveCount(6);
    await expect(page.getByTestId('p2p-maturities')).toBeVisible();
  });

  await test.step('an ambiguous transfer shows both legs in detail', async () => {
    await page
      .getByRole('link', { name: /K vyřešení/ })
      .first()
      .click();
    const ambiguous = page.getByTestId('ambiguous-transfer').first();
    await expect(ambiguous).toContainText('Odchozí platba');
    await expect(ambiguous).toContainText('DOBITI REVOLUT');
    await expect(ambiguous).toContainText('stejný den');
    await expect(ambiguous).toContainText('o 1 den později');
    await expect(ambiguous.getByTestId('transfer-leg')).toHaveCount(3);
  });
});
