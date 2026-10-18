import { expect, test, type Page } from '@playwright/test';
import { signIn } from '../e2e/helpers';

const OUT = 'static/landing';

const schemes = ['light', 'dark'] as const;

for (const scheme of schemes) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme });

    test(`landing page pictures, ${scheme}`, async ({ page }) => {
      await takePictures(page, scheme);
    });
  });
}

async function takePictures(page: Page, scheme: (typeof schemes)[number]) {
  const shot = async (name: string) => {
    // A pointer left over a chart would show its tooltip in the picture.
    await page.mouse.move(1, 1);
    await page.waitForTimeout(600);
    const file = scheme === 'dark' ? `${name}-dark` : name;
    await page.screenshot({ path: `${OUT}/${file}.jpg`, type: 'jpeg', quality: 78 });
  };

  await signIn(page);

  await page.getByTestId('net-worth').waitFor();
  await shot('overview');

  await page.goto('/triage');
  await page.getByTestId('triage-card').waitFor();
  await shot('triage');

  await page.goto('/overview');
  await page.getByRole('link', { name: 'Rozpočet', exact: true }).first().click();
  await expect(page).toHaveURL(/\/budget\/\d{4}-\d{2}/);
  await shot('budget');

  await page.goto('/investments');
  await page.getByTestId('position').first().waitFor();
  await shot('investments');

  await page.goto('/investments/US0378331005');
  await page.getByTestId('candles').locator('svg[role="img"]').waitFor({ timeout: 60_000 });
  await page
    .getByTestId('candles')
    .evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 24));
  await shot('instrument');

  await page.goto('/imports');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await shot('imports');
}
