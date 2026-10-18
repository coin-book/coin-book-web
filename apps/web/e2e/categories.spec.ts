import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => signIn(page));

test('a category can be created, given a subcategory, renamed and deleted', async ({ page }) => {
  const run = Date.now();
  const name = `Mazlíčci ${run}`;
  await page.goto('/categories');

  await page.getByRole('button', { name: 'Nová kategorie' }).click();
  await page.getByLabel('Název', { exact: true }).fill(name);
  await page.getByRole('radio', { name: 'limeta' }).check({ force: true });
  await page.getByRole('button', { name: 'Vytvořit' }).click();
  await expect(page.getByText('Kategorie vytvořena')).toBeVisible();

  const card = page.getByTestId('category-card').filter({ hasText: name });
  await card.getByRole('button', { name: 'Podkategorie' }).click();
  await card.getByLabel('Název podkategorie').fill('Krmivo');
  await card.getByRole('button', { name: 'Vytvořit' }).click();
  await expect(card.getByRole('button', { name: /Krmivo/ })).toBeVisible();

  await card.getByRole('button', { name: /Krmivo/ }).click();
  await card.getByLabel('Název', { exact: true }).fill('Granule');
  await card.getByRole('button', { name: 'Uložit' }).click();
  await expect(card.getByRole('button', { name: /Granule/ })).toBeVisible();

  await card.getByRole('button', { name: `Upravit ${name}` }).click();
  await card.getByRole('button', { name: 'Smazat' }).click();
  await expect(card.getByText(/Vyberte, kam je přesunout/)).toBeVisible();
  await card.getByLabel('Přesunout do').selectOption({ label: 'Ostatní výdaje' });
  await card.getByRole('button', { name: 'Přesunout a smazat' }).click();

  await expect(page.getByText(/data přesunuta do Ostatní výdaje/)).toBeVisible();
  await expect(page.getByTestId('category-card').filter({ hasText: name })).toHaveCount(0);
  await expect(
    page.locator('[data-testid=category-card][data-code=other]').getByRole('button', { name: /Granule/ }),
  ).toBeVisible();

  const leftover = page.locator('[data-testid=category-card][data-code=other]');
  await leftover.getByRole('button', { name: /Granule/ }).click();
  page.once('dialog', (d) => d.accept());
  await leftover.getByRole('button', { name: 'Smazat' }).click();
  await expect(page.getByText('Kategorie smazána')).toBeVisible();
});

test('a system category keeps its name but takes the user’s colour', async ({ page }) => {
  await page.goto('/categories');
  await page
    .locator('[data-testid=category-card][data-code=transport]')
    .getByRole('button', { name: /^Upravit/ })
    .click();
  const card = page.getByTestId('category-form');
  await expect(card.getByText(/název a typ zůstávají/)).toBeVisible();
  await expect(card.getByLabel('Název', { exact: true })).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Smazat' })).toHaveCount(0);

  await card.getByRole('radio', { name: 'chrpa' }).check({ force: true });
  await card.getByRole('button', { name: 'Uložit' }).click();
  await expect(page.getByText('Kategorie uložena')).toBeVisible();

  await page
    .locator('[data-testid=category-card][data-code=transport]')
    .getByRole('button', { name: /^Upravit/ })
    .click();
  await page.getByTestId('category-form').getByRole('radio', { name: 'mandarinka' }).check({ force: true });
  await page.getByTestId('category-form').getByRole('button', { name: 'Uložit' }).click();
  await expect(page.getByText('Kategorie uložena')).toBeVisible();
});
