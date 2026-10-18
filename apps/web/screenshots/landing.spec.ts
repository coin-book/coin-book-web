import { expect, test, type Page } from '@playwright/test';
import { signIn } from '../e2e/helpers';

const OUT = 'static/landing';

async function shot(page: Page, name: string) {
  // A pointer left over a chart would show its tooltip in the picture.
  await page.mouse.move(1, 1);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 78 });
}

test('landing page pictures', async ({ page }) => {
  await signIn(page);

  await page.getByTestId('net-worth').waitFor();
  await shot(page, 'overview');

  await page.goto('/triage');
  await page.getByTestId('triage-card').waitFor();
  await shot(page, 'triage');

  await page.goto('/overview');
  await page.getByRole('link', { name: 'Rozpočet', exact: true }).first().click();
  await expect(page).toHaveURL(/\/budget\/\d{4}-\d{2}/);
  await shot(page, 'budget');

  await page.goto('/investments');
  await page.getByTestId('position').first().waitFor();
  await shot(page, 'investments');

  await page.goto('/investments/US0378331005');
  await page.getByTestId('candles').locator('svg[role="img"]').waitFor({ timeout: 60_000 });
  await page
    .getByTestId('candles')
    .evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 24));
  await shot(page, 'instrument');

  await page.goto('/imports');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await shot(page, 'imports');
});
