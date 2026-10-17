import { expect, test } from '@playwright/test';

test('a new user registers and starts with an empty book of their own', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Nemáte účet? Založte si ho.' }).click();
  await page.getByLabel('E-mail').fill(`e2e-${Date.now()}@coinbook.local`);
  await page.getByLabel('Heslo').fill('heslo-heslo-1');
  await page.getByRole('button', { name: 'Založit a přihlásit' }).click();

  await expect(page).toHaveURL(/\/prehled/);
  await expect(page.getByRole('heading', { name: 'Zatím tu nic není' })).toBeVisible();
  await page.getByRole('link', { name: /Účty/ }).click();
  await expect(page.getByText('Účty vzniknou samy při prvním importu.')).toBeVisible();
});

test('registering an email that exists is refused', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Nemáte účet? Založte si ho.' }).click();
  await page.getByLabel('E-mail').fill('demo@coinbook.local');
  await page.getByLabel('Heslo').fill('heslo-heslo-1');
  await page.getByRole('button', { name: 'Založit a přihlásit' }).click();
  await expect(page.getByRole('alert')).toHaveText('Uživatel s tímto e-mailem už existuje. Přihlaste se.');
});

test('a failed Google sign-in explains itself on the sign-in page', async ({ page }) => {
  await page.goto('/login?error=google_sign_in_failed');
  await expect(page.getByRole('alert')).toHaveText('Přihlášení přes Google se nezdařilo. Zkuste to znovu.');
});
