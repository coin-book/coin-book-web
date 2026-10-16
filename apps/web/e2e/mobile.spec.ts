import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('overview fits a phone without horizontal scroll', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Zbývá utratit' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
