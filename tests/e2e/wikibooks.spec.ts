import { expect, type Page, test } from '@playwright/test';
import type { Opening, OpeningsDataset } from '../../src/data/opening.ts';
import {
  box,
  catalogOn,
  linkTo,
  movesOn,
  openingNameOn,
  PHONE,
  pieceFrom,
  startWithDelay,
  tabsOn,
} from './support.ts';

const RUY_LOPEZ = 'e4 e5 Nf3 Nc6 Bb5';

/** The line of the Wikibook with these moves, as the built site has it. */
async function bookLine(page: Page, moves: string): Promise<Opening> {
  const dataset: OpeningsDataset = await (await page.request.get('/openings.json')).json();
  const line = dataset.collections
    .find((collection) => collection.id === 'wikibooks')
    ?.openings.find((opening) => opening.san.join(' ') === moves);
  if (!line) throw new Error(`the Wikibook has no line ${moves}`);
  return line;
}

const wikibooksTab = (page: Page) => tabsOn(page, 'Collections').filter({ hasText: 'Wikibooks' });

test.beforeEach(async ({ page }) => {
  await startWithDelay(page, 400);
});

test('browsing the Wikibook: first move, group, line — and the opening plays', async ({ page }) => {
  await page.goto('/');
  const catalog = catalogOn(page);

  await wikibooksTab(page).click();
  await expect(wikibooksTab(page)).toHaveAttribute('aria-selected', 'true');
  await expect(tabsOn(page, 'First moves')).toHaveText(['1. e4', '1. d4', 'Other']);
  await expect(catalog.getByRole('heading', { name: 'King’s Pawn Openings' })).toBeVisible();

  const group = catalog.getByRole('button', {
    name: /^Ruy López \/ Spanish game 1\. e4 e5 2\. Nf3 Nc6 3\. Bb5 \d+$/,
  });
  await expect(group).toHaveAttribute('aria-expanded', 'false');
  await group.click();

  await catalog.getByRole('button', { name: /^C60 Ruy López \/ Spanish game: Main line/ }).click();

  await expect(openingNameOn(page)).toHaveAccessibleName('C60 Ruy López / Spanish game');
  await expect(page.locator('.opening__place')).toHaveText(
    '1. e4 · King’s Pawn Openings › Ruy López / Spanish game',
  );
  await expect(page).toHaveURL(/#\/wikibooks-\d+$/);
  await expect(page).toHaveTitle('Ruy López / Spanish game (C60) — Chess Openings');
  await expect(movesOn(page).getByRole('button', { name: '3. Bb5' })).toBeVisible();
  await expect(pieceFrom(page, 'f1')).toHaveAttribute('data-square', 'b5');
});

test('the other first moves have a section of their own', async ({ page }) => {
  await page.goto('/');
  await wikibooksTab(page).click();

  await tabsOn(page, 'First moves').filter({ hasText: 'Other' }).click();

  const catalog = catalogOn(page);
  await expect(catalog.getByRole('heading', { name: 'Flank & Irregular Openings' })).toBeVisible();
  await expect(catalog.getByRole('button', { name: /^English Opening 1\. c4 \d+$/ })).toBeVisible();
});

test('a line of the Wikibook links to its page in the book', async ({ page }) => {
  const line = await bookLine(page, RUY_LOPEZ);

  await page.goto(linkTo(line.id));

  const link = page
    .getByRole('region', { name: 'Board' })
    .getByRole('link', { name: 'Read about this position in Chess Opening Theory, on Wikibooks' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute(
    'href',
    `https://en.wikibooks.org/wiki/Special:Redirect/page/${line.page}`,
  );
});

test('a link to a line of the Wikibook finds it in its own collection, and plays it', async ({
  page,
}) => {
  const line = await bookLine(page, RUY_LOPEZ);

  await page.goto(linkTo(line.id));

  await expect(openingNameOn(page)).toHaveAccessibleName('C60 Ruy López / Spanish game');
  await expect(wikibooksTab(page)).toHaveAttribute('aria-selected', 'true');
  await expect(tabsOn(page, 'First moves').first()).toHaveAttribute('aria-selected', 'true');
  const current = catalogOn(page).locator('.line[aria-current="true"]');
  await expect(current).toHaveAccessibleName(/^C60 Ruy López \/ Spanish game: Main line 1\. e4 e5/);
  await expect(current).toBeInViewport();
  await expect(pieceFrom(page, 'f1')).toHaveAttribute('data-square', 'b5');
});

test('the lines of one of its families can be stepped through', async ({ page }) => {
  const line = await bookLine(page, RUY_LOPEZ);
  await page.goto(linkTo(line.id));
  const lines = page.getByRole('group', { name: 'Lines of Ruy López / Spanish game' });
  await expect(lines).toContainText(/^1 of \d+$/);

  await lines.getByRole('button', { name: /^Next line: 3… / }).click();

  await expect(openingNameOn(page)).toHaveAccessibleName('C60 Ruy López / Spanish game');
  await expect(page.locator('.opening__variation')).toHaveText(/^3… /);
  await expect(lines).toContainText(/^2 of \d+$/);
  await expect(page).not.toHaveURL(new RegExp(`${line.id}$`));
});

test('searching looks in the collection on show, and counts the matches in each', async ({
  page,
}) => {
  await page.goto('/');
  const catalog = catalogOn(page);
  const search = catalog.getByRole('searchbox', { name: 'Search openings' });
  const results = catalog.getByRole('region', { name: 'Search results' });

  await search.fill('ruy lopez');

  await expect(results.getByRole('button').first()).toHaveAccessibleName(
    /^C60 Ruy Lopez 1\. e4 e5 2\. Nf3 Nc6 3\. Bb5$/,
  );
  await expect(tabsOn(page, 'Collections').first()).toHaveAccessibleName(/^ECO \d+ matches$/);
  await expect(wikibooksTab(page)).toHaveAccessibleName(/^Wikibooks \d+ matches$/);

  await wikibooksTab(page).click();

  await expect(results.getByRole('button').first()).toHaveAccessibleName(
    /^C60 Ruy López \/ Spanish game 1\. e4 e5 2\. Nf3 Nc6 3\. Bb5$/,
  );
  await results.getByRole('button').first().click();
  await expect(page).toHaveURL(/#\/wikibooks-\d+$/);
  await expect(openingNameOn(page)).toHaveAccessibleName('C60 Ruy López / Spanish game');

  await search.fill('');
  await expect(wikibooksTab(page)).toHaveAccessibleName('Wikibooks');
  await expect(wikibooksTab(page)).toHaveAttribute('aria-selected', 'true');
  await expect(tabsOn(page, 'First moves')).toHaveCount(3);
});

test('a search for something only the Wikibook has says where to look', async ({ page }) => {
  await page.goto('/');
  const catalog = catalogOn(page);

  await catalog.getByRole('searchbox', { name: 'Search openings' }).fill('rybasov');

  await expect(catalog.getByRole('status')).toHaveText('No openings match “rybasov” in ECO.');
  await expect(wikibooksTab(page)).toHaveAccessibleName(/^Wikibooks [1-9]\d* match(es)?$/);
});

test('the Wikibook’s lines are found by ECO code and by moves too', async ({ page }) => {
  await page.goto('/');
  await wikibooksTab(page).click();
  const catalog = catalogOn(page);
  const search = catalog.getByRole('searchbox', { name: 'Search openings' });
  const first = catalog.getByRole('region', { name: 'Search results' }).getByRole('button').first();

  await search.fill('C60');
  await expect(first).toHaveAccessibleName(/^C60 Ruy López \/ Spanish game 1\. e4/);

  await search.fill('e4 c5 nf3 d6 d4');
  await expect(first).toHaveAccessibleName(/^B5\d .* 1\. e4 c5 2\. Nf3 d6 3\. d4$/);
});

test('the page credits the book, its authors and its licence', async ({ page }) => {
  await page.goto('/');
  const credits = page.locator('.credits');

  await expect(credits).toContainText('lichess-org/chess-openings');
  await expect(credits).toContainText(
    /from Chess Opening Theory by Wikibooks contributors @ 20\d\d-\d\d-\d\d, under CC BY-SA 4\.0/,
  );
  await expect(credits.getByRole('link', { name: 'Chess Opening Theory' })).toHaveAttribute(
    'href',
    'https://en.wikibooks.org/wiki/Chess_Opening_Theory',
  );
  await expect(credits.getByRole('link', { name: 'CC BY-SA 4.0' })).toHaveAttribute(
    'href',
    'https://creativecommons.org/licenses/by-sa/4.0/',
  );
});

for (const [name, use] of [
  ['on a phone', PHONE],
  ['on a small laptop', { viewport: { width: 1024, height: 700 } }],
] as const) {
  test.describe(name, () => {
    test.use(use);

    test('the collection tabs and the Wikibook’s own stay inside the catalog', async ({ page }) => {
      await page.goto('/');
      await wikibooksTab(page).click();
      const catalog = await box(catalogOn(page));

      for (const row of ['Collections', 'First moves']) {
        for (const tab of await tabsOn(page, row).all()) {
          const { x, width } = await box(tab);
          expect(x).toBeGreaterThanOrEqual(catalog.x);
          expect(x + width).toBeLessThanOrEqual(catalog.x + catalog.width);
          expect(await tab.evaluate((found) => found.scrollWidth <= found.clientWidth)).toBe(true);
        }
      }
    });

    test('the link to the book does not push the board off the page', async ({ page }) => {
      const line = await bookLine(page, RUY_LOPEZ);
      await page.goto(linkTo(line.id));
      const link = await box(page.getByRole('link', { name: /on Wikibooks$/ }));
      const viewport = page.viewportSize();

      expect(link.x + link.width).toBeLessThanOrEqual(viewport?.width ?? 0);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);
    });
  });
}
