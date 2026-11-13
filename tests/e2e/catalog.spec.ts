import { expect, test } from '@playwright/test';
import { FEATURED_OPENINGS } from '../../src/catalog/featured.ts';
import {
  boardOn,
  box,
  catalogOn,
  controlsOn,
  ITALIAN_GAME,
  movesOn,
  NAJDORF,
  openingNameOn,
  pieceFrom,
  startWithDelay,
} from './support.ts';

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
  await page.goto(ITALIAN_GAME);
  const catalog = await box(catalogOn(page));
  const board = await box(boardOn(page));
  const moves = await box(movesOn(page));
  const controls = await box(controlsOn(page));

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

  await catalog.getByRole('button', { name: /^C50 Italian Game: Main line/ }).click();

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
    /^D85 Grünfeld Defense: Exchange Variation/,
  );

  await search.fill('C89');
  await expect(catalog.getByRole('status')).toHaveText(/^\d+ openings$/);
  await expect(results.getByRole('button').first()).toHaveAccessibleName(
    /^C89 Ruy Lopez: Marshall Attack/,
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
  await page.goto(NAJDORF);
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
  await expect(line).toHaveAccessibleName(/^B90 Sicilian Defense: Najdorf Variation 1\. e4 c5/);
  await expect(line).toBeInViewport();
  await expect(pieceFrom(page, 'c7')).toHaveAttribute('data-square', 'c5');
});

test('the back button returns to the opening before', async ({ page }) => {
  await page.goto(ITALIAN_GAME);
  await expect(openingNameOn(page)).toHaveAccessibleName('C50 Italian Game');
  const catalog = catalogOn(page);
  await catalog.getByRole('searchbox', { name: 'Search openings' }).fill('ruy lopez');
  await catalog.getByRole('region', { name: 'Search results' }).getByRole('button').first().click();
  await expect(openingNameOn(page)).toHaveAccessibleName('C60 Ruy Lopez');

  await page.goBack();

  await expect(openingNameOn(page)).toHaveAccessibleName('C50 Italian Game');
  await expect(movesOn(page).getByRole('button', { name: '3. Bc4' })).toBeVisible();
});

test('the openings are fetched once, alongside the page rather than after it', async ({ page }) => {
  const fetched: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/openings.json')) fetched.push(request.resourceType());
  });

  await page.goto('/');
  await expect(catalogOn(page).getByRole('tab')).toHaveCount(5);

  expect(fetched).toHaveLength(1);
  await expect(page.locator('link[rel="preload"][as="fetch"]')).toHaveAttribute(
    'href',
    '/openings.json',
  );
});

test('a first-time visitor can start from a well-known opening', async ({ page }) => {
  await page.goto('/');
  const classics = page.getByRole('list', { name: 'Well-known openings' });
  await expect(classics.getByRole('button')).toHaveCount(FEATURED_OPENINGS.length);
  await expect(classics.getByRole('button').first()).toHaveText('Italian Game');

  await classics.getByRole('button', { name: 'Ruy Lopez' }).click();

  await expect(openingNameOn(page)).toHaveAccessibleName('C60 Ruy Lopez');
  await expect(page).toHaveTitle('Ruy Lopez (C60) — Chess Openings');
  await expect(pieceFrom(page, 'e2')).toHaveAttribute('data-square', 'e4');
});

test('the lines of a family can be stepped through, one after another', async ({ page }) => {
  await page.goto(NAJDORF);
  const lines = page.getByRole('group', { name: 'Lines of Sicilian Defense' });
  await expect(lines).toContainText(/^1 of \d+$/);
  await expect(lines.getByRole('button', { name: /^Previous line/ })).toBeDisabled();

  await lines.getByRole('button', { name: /^Next line/ }).click();

  await expect(openingNameOn(page)).toHaveAccessibleName(
    /^B90 Sicilian Defense: Najdorf Variation, /,
  );
  await expect(lines).toContainText(/^2 of \d+$/);
  await expect(page).not.toHaveURL(/sicilian-defense-najdorf-variation$/);
  await expect(catalogOn(page).locator('.line[aria-current="true"]')).toBeInViewport();

  await lines.getByRole('button', { name: /^Previous line/ }).click();

  await expect(openingNameOn(page)).toHaveAccessibleName('B90 Sicilian Defense: Najdorf Variation');
});

test('the page credits its sources', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.credits')).toContainText('lichess-org/chess-openings');
  await expect(page.locator('.credits')).toContainText('Colin M.L. Burnett');
});
