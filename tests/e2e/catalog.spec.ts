import { expect, type Page, test } from '@playwright/test';
import { boardOn, box, movesOn, pieceFrom, startWithDelay } from './support.ts';

const catalogOn = (page: Page) => page.getByRole('navigation', { name: 'Openings' });
/** The name of the opening on the board, above the board. */
const openingNameOn = (page: Page) =>
  page.getByRole('region', { name: 'Board' }).getByRole('heading', { level: 2 });

test.beforeEach(async ({ page }) => {
  await startWithDelay(page, 400);
});

test('arriving: a board, an invitation, and the whole encyclopaedia to browse', async ({
  page,
}) => {
  await page.goto('/');
  const catalog = catalogOn(page);

  await expect(page.getByRole('heading', { name: 'Choose an opening' })).toBeVisible();
  await expect(boardOn(page).locator('.piece')).toHaveCount(32);
  await expect(catalog.getByRole('tab')).toHaveText(['A', 'B', 'C', 'D', 'E']);
  await expect(catalog.getByRole('searchbox', { name: 'Search openings' })).toHaveAttribute(
    'placeholder',
    /^Search 3,\d{3} openings$/,
  );
  await expect(movesOn(page)).toContainText('Choose an opening');
});

test('the catalog is to the left of the board, and nothing spills off the page', async ({
  page,
}) => {
  await page.goto('/#/italian-game');
  const catalog = await box(catalogOn(page));
  const board = await box(boardOn(page));
  const moves = await box(movesOn(page));
  const controls = await box(page.getByRole('group', { name: 'Player controls' }));

  expect(catalog.x + catalog.width).toBeLessThanOrEqual(board.x);
  expect(board.x + board.width).toBeLessThanOrEqual(moves.x);
  expect(board.width).toBeCloseTo(board.height, 0);
  expect(board.y + board.height).toBeLessThanOrEqual(controls.y);
  expect(board.width).toBeGreaterThan(300);
  const scrolls = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight,
  );
  expect(scrolls).toBe(false);
});

test('browsing: volume, group, line — and the opening plays', async ({ page }) => {
  await page.goto('/');
  const catalog = catalogOn(page);

  await catalog.getByRole('tab', { name: 'Volume C: Open Games & French Defense' }).click();
  await expect(catalog.getByRole('heading', { name: 'Open Games & French Defense' })).toBeVisible();

  const group = catalog.getByRole('button', {
    name: /C50–C54.*Italian Game: Giuoco Piano & Evans Gambit/,
  });
  await expect(group).toHaveAttribute('aria-expanded', 'false');
  await group.click();
  await expect(group).toHaveAttribute('aria-expanded', 'true');

  await catalog.getByRole('button', { name: 'Italian Game (C50)', exact: true }).click();

  await expect(openingNameOn(page)).toHaveAccessibleName('C50 Italian Game');
  await expect(page).toHaveURL(/#\/italian-game$/);
  await expect(movesOn(page).getByRole('button', { name: '3. Bc4' })).toBeVisible();
  await expect(pieceFrom(page, 'e2')).toHaveAttribute('data-square', 'e4');
  await expect(pieceFrom(page, 'f1')).toHaveAttribute('data-square', 'c4');
});

test('searching by name, by ECO code and by moves', async ({ page }) => {
  await page.goto('/');
  const catalog = catalogOn(page);
  const search = catalog.getByRole('searchbox', { name: 'Search openings' });
  const results = catalog.getByRole('region', { name: 'Search results' });

  await search.fill('grunfeld exchange');
  await expect(results.getByRole('button').first()).toHaveAccessibleName(
    /^Grünfeld Defense: Exchange Variation/,
  );

  await search.fill('C89');
  await expect(catalog.getByRole('status')).toHaveText(/^\d+ openings$/);
  await expect(results.getByRole('button').first()).toHaveAccessibleName(
    /Ruy Lopez: Marshall Attack.*\(C89\)/,
  );

  await search.fill('1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6');
  await results.getByRole('button').first().click();

  await expect(openingNameOn(page)).toHaveAccessibleName('B90 Sicilian Defense: Najdorf Variation');
  await expect(page).toHaveURL(/#\/sicilian-defense-najdorf-variation$/);
  await expect(pieceFrom(page, 'c7')).toHaveAttribute('data-square', 'c5');

  await search.fill('');
  await expect(catalog.getByRole('tab', { name: /Volume A/ })).toBeVisible();
});

test('a link to an opening opens it, finds it in the catalog, and plays it', async ({ page }) => {
  await page.goto('/#/sicilian-defense-najdorf-variation');
  const catalog = catalogOn(page);

  await expect(openingNameOn(page)).toHaveAccessibleName('B90 Sicilian Defense: Najdorf Variation');
  await expect(page.locator('.opening__place')).toHaveText(
    'Volume B · Semi-Open Games › B90–B99 · Sicilian Defense: Najdorf',
  );
  await expect(catalog.getByRole('tab', { name: /Volume B/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const line = catalog.locator('.line[aria-current="true"]');
  await expect(line).toHaveAccessibleName('Sicilian Defense: Najdorf Variation (B90)');
  await expect(line).toBeInViewport();
  await expect(pieceFrom(page, 'a7')).toHaveAttribute('data-square', 'a6', { timeout: 8000 });
});

test('the back button returns to the opening before', async ({ page }) => {
  await page.goto('/#/italian-game');
  await expect(openingNameOn(page)).toHaveAccessibleName('C50 Italian Game');
  const catalog = catalogOn(page);
  await catalog.getByRole('searchbox', { name: 'Search openings' }).fill('ruy lopez');
  await catalog.getByRole('region', { name: 'Search results' }).getByRole('button').first().click();
  await expect(openingNameOn(page)).toHaveAccessibleName('C60 Ruy Lopez');

  await page.goBack();

  await expect(openingNameOn(page)).toHaveAccessibleName('C50 Italian Game');
  await expect(movesOn(page).getByRole('button', { name: '3. Bc4' })).toBeVisible();
});

test('the page credits its sources', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.credits')).toContainText('lichess-org/chess-openings');
  await expect(page.locator('.credits')).toContainText('Colin M.L. Burnett');
});
