import { expect, type Page } from '@playwright/test';

export const DEMO = { email: 'demo@coinbook.local', password: 'demo-heslo-1234' };

export async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(DEMO.email);
  await page.getByLabel('Heslo').fill(DEMO.password);
  await page.getByRole('button', { name: 'Přihlásit' }).click();
  await expect(page).toHaveURL(/\/prehled/);
}
