import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import {
  arriveAt,
  catalogOn,
  collectionTabOn,
  ITALIAN_GAME,
  PHONE,
  pieceFrom,
  startWithDelay,
  stepInto,
  tabsOn,
  volumeTabsOn,
} from './support.ts';

/** Runs the axe accessibility checks over the page and returns what they object to. */
async function violations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations.map(
    ({ id, help, nodes }) => `${id}: ${help} (${nodes.map((node) => node.target).join(', ')})`,
  );
}

/** The Italian Game, three moves in and paused: its group is open in the catalog. */
async function watchItalianGame(page: Page) {
  await stepInto(page, ITALIAN_GAME, 3);
  await expect(pieceFrom(page, 'g1')).toHaveAttribute('data-square', 'f3');
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`in ${colorScheme} colours`, () => {
    test.use({ colorScheme });

    test('the page a visitor arrives at passes the automated accessibility checks', async ({
      page,
    }) => {
      await page.goto('/');
      await expect(volumeTabsOn(page)).toHaveCount(5);

      expect(await violations(page)).toEqual([]);
    });

    test('so does the Wikibook, browsed and with one of its lines on the board', async ({
      page,
    }) => {
      await startWithDelay(page, 5000);
      await page.goto('/');
      await collectionTabOn(page, 'Wikibooks').click();
      await expect(tabsOn(page, 'First moves')).toHaveCount(3);
      expect(await violations(page)).toEqual([]);

      await catalogOn(page)
        .getByRole('button', { name: /^Open game/ })
        .click();
      await catalogOn(page)
        .getByRole('button', { name: /^C20 Open game: Main line/ })
        .click();
      await expect(page.getByRole('link', { name: /on Wikibooks$/ })).toBeVisible();

      expect(await violations(page)).toEqual([]);
    });

    test('so does an opening being played, with its group open in the catalog', async ({
      page,
    }) => {
      await watchItalianGame(page);

      expect(await violations(page)).toEqual([]);
    });

    test('and so do search results', async ({ page }) => {
      await watchItalianGame(page);
      await catalogOn(page).getByRole('searchbox', { name: 'Search openings' }).fill('gambit');
      await expect(catalogOn(page).getByRole('status')).toContainText('openings');

      expect(await violations(page)).toEqual([]);
    });
  });
}

test.describe('on a phone', () => {
  test.use(PHONE);

  test('an opening being played passes the automated accessibility checks', async ({ page }) => {
    await watchItalianGame(page);

    expect(await violations(page)).toEqual([]);
  });
});

test('each move is announced to a screen reader as it is made', async ({ page }) => {
  await startWithDelay(page, 5000);
  await page.goto(ITALIAN_GAME);
  const announcer = page.locator('.announcer');
  await expect(announcer).toHaveRole('status');
  await expect(announcer).toHaveText('Italian Game, 5 moves');

  await page.keyboard.press('ArrowRight');
  await expect(announcer).toHaveText('1. e4');

  await page.keyboard.press('ArrowRight');
  await expect(announcer).toHaveText('1… e5');

  // It is there for assistive technology only.
  const { width, height } = (await announcer.boundingBox()) ?? { width: 0, height: 0 };
  expect(width * height).toBeLessThanOrEqual(1);
});

test('the keyboard reaches the player controls in one step, past the catalog', async ({ page }) => {
  await page.goto(ITALIAN_GAME);

  await page.keyboard.press('Tab');
  const skip = page.getByRole('button', { name: 'Skip to player controls' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();

  await page.keyboard.press('Enter');

  await expect(
    page.getByRole('group', { name: 'Playback' }).getByRole('button', { name: 'Pause' }),
  ).toBeFocused();
});

test('nothing moves on the board for someone who has asked for reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startWithDelay(page, 5000);
  await arriveAt(page, ITALIAN_GAME);
  await page.keyboard.press('Space');

  await page.keyboard.press('ArrowRight');

  // The piece is on its new square at once: no slide to wait for.
  const [pawn, square] = await Promise.all([
    pieceFrom(page, 'e2').boundingBox(),
    page.locator('.square[data-square="e4"]').boundingBox(),
  ]);
  expect(pawn?.y).toBeCloseTo(square?.y ?? -1, 0);
});
