import { expect, type Page, test } from '@playwright/test';
import {
  boardOn,
  box,
  catalogOn,
  controlsOn,
  ITALIAN_GAME,
  linkTo,
  movesOn,
  NAJDORF,
  openingNameOn,
  PHONE,
  pieceFrom,
  stepInto,
} from './support.ts';

const overflowsSideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

test.describe('on a phone', () => {
  test.use(PHONE);

  test('everything is stacked, nothing spills sideways, and the board comes first', async ({
    page,
  }) => {
    await page.goto(ITALIAN_GAME);
    const viewport = page.viewportSize() ?? { width: 0, height: 0 };
    const board = await box(boardOn(page));
    const moves = await box(movesOn(page));
    const catalog = await box(catalogOn(page));

    expect(await overflowsSideways(page)).toBe(false);
    // The board is nearly as wide as the screen, square, and wholly visible without scrolling.
    expect(board.width).toBeGreaterThan(viewport.width * 0.85);
    expect(board.width).toBeCloseTo(board.height, 0);
    expect(board.y + board.height).toBeLessThan(viewport.height);
    // Then the moves, then the catalog.
    expect(moves.y).toBeGreaterThanOrEqual(board.y + board.height);
    expect(catalog.y).toBeGreaterThanOrEqual(moves.y + moves.height);
  });

  test('the controls stay at the bottom of the screen, and all of them fit', async ({ page }) => {
    await page.goto(ITALIAN_GAME);
    const viewport = page.viewportSize() ?? { width: 0, height: 0 };

    await catalogOn(page).scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 600);

    const controls = await box(controlsOn(page));
    expect(controls.y + controls.height).toBeCloseTo(viewport.height, 0);
    for (const name of [
      'Restart',
      'Step back',
      'Pause',
      'Step forward',
      'Jump to end',
      'Flip board',
      'Sound',
    ]) {
      const button = await box(controlsOn(page).getByRole('button', { name, exact: true }));
      expect(button.x, name).toBeGreaterThanOrEqual(0);
      expect(button.x + button.width, name).toBeLessThanOrEqual(viewport.width);
      expect(Math.min(button.width, button.height), name).toBeGreaterThanOrEqual(40);
    }
    await expect(page.getByRole('slider', { name: 'Delay between moves' })).toBeInViewport();
  });

  test('the page holds still while the cursor travels through the moves', async ({ page }) => {
    await stepInto(page, NAJDORF, 10);
    await expect(pieceFrom(page, 'a7')).toHaveAttribute('data-square', 'a6');

    // The move list has scrolled itself to keep its cursor in sight …
    const cursorInSight = await page.evaluate(() => {
      const list = document.querySelector('.move-list__moves')?.getBoundingClientRect();
      const cursor = document
        .querySelector('.move-list [aria-current="step"]')
        ?.getBoundingClientRect();
      return Boolean(
        list && cursor && cursor.top >= list.top - 1 && cursor.bottom <= list.bottom + 1,
      );
    });
    expect(cursorInSight).toBe(true);
    // … and has not dragged the page along with it: the board is still where it was.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(boardOn(page)).toBeInViewport({ ratio: 1 });
  });

  test('the board comes before the catalog for the keyboard and for screen readers too', async ({
    page,
  }) => {
    await page.goto(ITALIAN_GAME);

    const boardFirst = await page.evaluate(() => {
      const board = document.querySelector('[aria-label="Chess board"]');
      const catalog = document.querySelector('nav[aria-label="Openings"]');
      return Boolean(
        board &&
          catalog &&
          board.compareDocumentPosition(catalog) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });

    expect(boardFirst).toBe(true);
  });

  test('choosing an opening further down the page brings the board back into view', async ({
    page,
  }) => {
    await page.goto('/');
    const catalog = catalogOn(page);
    await catalog.getByRole('searchbox', { name: 'Search openings' }).fill('ruy lopez');
    const result = catalog
      .getByRole('region', { name: 'Search results' })
      .getByRole('button')
      .first();
    await result.scrollIntoViewIfNeeded();

    await result.click();

    await expect(openingNameOn(page)).toHaveAccessibleName('C60 Ruy Lopez');
    await expect(boardOn(page)).toBeInViewport({ ratio: 1 });
  });

  test('a link to an opening shows the board, not the catalog entry far below it', async ({
    page,
  }) => {
    await page.goto(linkTo('kings-indian-defense'));

    await expect(openingNameOn(page)).toHaveAccessibleName(/King's Indian Defense/);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test.describe('on a tablet held upright', () => {
  test.use({ viewport: { width: 820, height: 1180 } });

  test('the layout is stacked and the board makes use of the width', async ({ page }) => {
    await page.goto(ITALIAN_GAME);
    const board = await box(boardOn(page));
    const moves = await box(movesOn(page));

    expect(await overflowsSideways(page)).toBe(false);
    expect(board.width).toBeGreaterThan(500);
    expect(board.width).toBeCloseTo(board.height, 0);
    expect(moves.y).toBeGreaterThanOrEqual(board.y + board.height);
  });
});

test.describe('on a small laptop', () => {
  test.use({ viewport: { width: 1024, height: 700 } });

  test('there is still room for all three columns', async ({ page }) => {
    await page.goto(ITALIAN_GAME);
    const catalog = await box(catalogOn(page));
    const board = await box(boardOn(page));
    const moves = await box(movesOn(page));

    expect(catalog.x + catalog.width).toBeLessThanOrEqual(board.x);
    expect(board.x + board.width).toBeLessThanOrEqual(moves.x);
    expect(board.width).toBeGreaterThan(300);
    expect(await overflowsSideways(page)).toBe(false);
  });
});
