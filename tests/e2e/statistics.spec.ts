import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import {
  arriveAt,
  boardOn,
  box,
  linkTo,
  movesOn,
  openingNameOn,
  PHONE,
  pieceFrom,
  startWithDelay,
} from './support.ts';

const SICILIAN = linkTo('sicilian-defense');

const panelOn = (page: Page) => page.getByRole('region', { name: 'Statistics' });
const toggleOn = (page: Page) => page.getByRole('button', { name: 'Statistics', exact: true });

/** The requests the page makes for the detail of the statistics, as they are made. */
function detailRequests(page: Page): string[] {
  const asked: string[] = [];
  page.on('request', (request) => {
    const file = /\/statistics\/(\d+\.json)$/.exec(request.url());
    if (file?.[1]) asked.push(file[1]);
  });
  return asked;
}

test('the build ships the detail in files of a few hundred positions', async ({ request }) => {
  const statistics = await (await request.get('/statistics.json')).json();
  const files = Math.ceil(statistics.positions.length / statistics.detail.size);

  expect(statistics.detail.size).toBe(256);
  expect(statistics.detail.bands).toEqual([0, 1200, 1600, 2000, 2400]);
  expect(statistics.detail.speeds).toEqual(['bullet', 'blitz', 'rapid', 'classical']);

  const first = await request.get('/statistics/0.json');
  const last = await request.get(`/statistics/${files - 1}.json`);
  expect(first.ok()).toBe(true);
  expect(last.ok()).toBe(true);
  expect((await request.get(`/statistics/${files}.json`)).ok()).toBe(false);
  expect(await first.json()).toHaveLength(256);
  expect((await first.body()).length).toBeLessThan(200_000);
  const [start] = await first.json();
  expect(start.moves[0]).toEqual(['e4', expect.any(Number), expect.any(Number)]);
});

test.describe('the statistics of the opening on the board', () => {
  test.beforeEach(async ({ page }) => {
    await startWithDelay(page, 5000);
  });

  test('are in a panel that is shut until asked for, and fetches nothing until then', async ({
    page,
  }) => {
    const asked = detailRequests(page);
    await arriveAt(page, SICILIAN);

    await expect(toggleOn(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(panelOn(page).getByRole('heading', { level: 3 })).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(asked).toEqual([]);

    await toggleOn(page).click();

    await expect(toggleOn(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(panelOn(page).getByRole('heading', { level: 3 })).toHaveText([
      'How often',
      'How it goes',
      'Who plays it',
      'At what speed',
      'What is played next',
      'How long',
    ]);
    expect(asked).toHaveLength(1);
  });

  test('say how often, how it goes, and how that stands against the ratings', async ({ page }) => {
    await arriveAt(page, SICILIAN);
    await toggleOn(page).click();
    const panel = panelOn(page);

    await expect(panel.locator('.stats__often')).toHaveText(
      '8,666,513 games reached this position: 9.2% of the 94,074,706 counted on lichess in October 2026.',
    );
    await expect(panel.locator('.stats__outcomes li')).toHaveText([
      /^White wins \d\d\.\d%$/,
      /^Draws \d\.\d%$/,
      /^Black wins \d\d\.\d%$/,
    ]);
    await expect(panel.locator('.stats__score')).toHaveText(/^White scores \d\d\.\d%\.$/);
    await expect(panel.locator('.stats__ratings')).toHaveText(
      /^The players’ ratings predicted \d\d\.\d% for White, who scored \d\d\.\d%: \d\.\d points (more|less)\. Over all games White does 1\.6 points better than predicted, so the opening is doing well for Black\.$/,
    );
  });

  test('say who plays it and at what speed: the masters play the Sicilian most', async ({
    page,
  }) => {
    await arriveAt(page, SICILIAN);
    await toggleOn(page).click();
    const bands = panelOn(page).getByRole('table', { name: 'Who plays it' });
    const speeds = panelOn(page).getByRole('table', { name: 'At what speed' });

    await expect(bands.getByRole('row')).toHaveCount(6);
    await expect(bands.getByRole('row').nth(1)).toHaveText(/Under 1200\s*4\.4%\s*\d\d\.\d%/);
    await expect(bands.getByRole('row').nth(5)).toHaveText(/2400 and over\s*12%\s*\d\d\.\d%/);
    await expect(speeds.getByRole('rowheader')).toHaveText([
      'Bullet',
      'Blitz',
      'Rapid',
      'Classical',
    ]);
  });

  test('list what is played next; a move that leads to a line opens that line', async ({
    page,
  }) => {
    const asked = detailRequests(page);
    await arriveAt(page, SICILIAN);
    await toggleOn(page).click();
    const moves = panelOn(page).getByRole('list', { name: 'What is played next' });

    await expect(moves.getByRole('listitem')).toHaveCount(11);
    await expect(moves.getByRole('listitem').first()).toContainText('2. Nf3');
    await expect(moves.getByRole('listitem').last()).toContainText('Other moves');

    await moves.getByRole('listitem').first().getByRole('button').click();

    await expect(page).toHaveURL(/#\/sicilian-defense-[a-z0-9-]+$/);
    await expect(pieceFrom(page, 'g1')).toHaveAttribute('data-square', 'f3');
    await expect(movesOn(page).getByRole('button', { name: '2. Nf3' })).toBeVisible();
    // The panel stays open, on the numbers of the line it led to.
    await expect(toggleOn(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(panelOn(page).locator('.stats__often')).not.toContainText('8,666,513');
    await expect(moves.getByRole('listitem').first()).toContainText('2…');
    expect(asked.length).toBeLessThanOrEqual(2);
  });

  test('say how long the games last, and what the numbers are', async ({ page }) => {
    await arriveAt(page, SICILIAN);
    await toggleOn(page).click();
    const panel = panelOn(page);

    await expect(panel.locator('.stats__length')).toHaveText(
      /^The games last \d\d moves on average, and \d+(\.\d)?% of them are over within twenty\.$/,
    );
    const about = panel.locator('.stats__about');
    await about.locator('summary').click();
    await expect(about).toContainText('One month of rated games on lichess');
    await expect(about).toContainText('lichess’s ratings, not FIDE’s');
    await expect(about).toContainText('abandoned');
  });

  test('show the count but no score where the games are too few', async ({ page }) => {
    // A line of the Amar Opening that a few hundred games reached.
    await arriveAt(page, linkTo('amar-opening-paris-gambit'));
    await toggleOn(page).click();
    const panel = panelOn(page);

    await expect(panel.locator('.stats__often')).toHaveText(
      /^\d{1,3} games reached this position: /,
    );
    await expect(panel.locator('.stats__score')).toHaveText(
      'Too few games to say how the opening scores.',
    );
    await expect(panel.locator('.stats__ratings')).toHaveCount(0);
    await expect(panel.locator('.stats__outcomes li').first()).toHaveText(/^White wins \d+$/);
    await expect(panel.getByRole('table', { name: 'Who plays it' })).toContainText('too few games');
  });

  test('can be opened, read and closed with the keyboard alone', async ({ page }) => {
    await arriveAt(page, SICILIAN);
    await page.keyboard.press('Space');

    await toggleOn(page).focus();
    await page.keyboard.press('Enter');
    await expect(panelOn(page).locator('.stats__length')).toBeVisible();

    // Into the panel: the first thing to stop at is a move that leads somewhere.
    await page.keyboard.press('Tab');
    await expect(
      panelOn(page).getByRole('list', { name: 'What is played next' }).getByRole('button').first(),
    ).toBeFocused();

    await toggleOn(page).focus();
    await page.keyboard.press('Enter');
    await expect(toggleOn(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(panelOn(page).locator('.stats__length')).toBeHidden();
    await expect(toggleOn(page)).toBeFocused();
  });

  test('say so when the detail cannot be had, and the rest of the site carries on', async ({
    page,
  }) => {
    await page.route('**/statistics/*.json', (route) => route.fulfill({ status: 503, body: '' }));
    await arriveAt(page, SICILIAN);
    await toggleOn(page).click();

    await expect(panelOn(page).getByRole('alert')).toHaveText(
      'The rest of the numbers could not be fetched.',
    );
    await expect(panelOn(page).locator('.stats__often')).toContainText('8,666,513 games');

    await page.unroute('**/statistics/*.json');
    await panelOn(page).getByRole('button', { name: 'Try again' }).click();
    await expect(panelOn(page).getByRole('heading', { level: 3 })).toHaveCount(6);

    await page.keyboard.press('ArrowRight');
    await expect(pieceFrom(page, 'e2')).toHaveAttribute('data-square', 'e4');
  });

  test('are not there for the page a visitor arrives at, nor without the numbers', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('list', { name: 'Most played openings' })).toBeVisible();
    await expect(panelOn(page)).toBeHidden();

    await page.route('**/statistics.json', (route) => route.fulfill({ status: 404, body: '' }));
    await arriveAt(page, SICILIAN);
    await expect(openingNameOn(page)).toHaveAccessibleName('B20 Sicilian Defense');
    await expect(panelOn(page)).toBeHidden();
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`pass the automated accessibility checks, open, in ${colorScheme} colours`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await arriveAt(page, SICILIAN);
      await page.keyboard.press('Space');
      await toggleOn(page).click();
      await expect(panelOn(page).locator('.stats__length')).toBeVisible();
      await panelOn(page).locator('.stats__about summary').click();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations.map(({ id, nodes }) => `${id}: ${nodes[0]?.target}`)).toEqual([]);
    });
  }

  test('sit beside the board, under the moves, and open without moving the board', async ({
    page,
  }) => {
    await arriveAt(page, SICILIAN);
    await page.keyboard.press('Space');
    const before = await box(boardOn(page));
    const moves = await box(movesOn(page));
    const shut = await box(panelOn(page));
    expect(shut.x).toBeCloseTo(moves.x, 0);
    expect(shut.y).toBeGreaterThanOrEqual(moves.y + moves.height);

    await toggleOn(page).click();
    await expect(panelOn(page).locator('.stats__length')).toBeAttached();

    expect(await box(boardOn(page))).toEqual(before);
    const open = await box(panelOn(page));
    const viewport = page.viewportSize() ?? { width: 0, height: 0 };
    expect(open.height).toBeGreaterThan(shut.height + 100);
    expect(open.x + open.width).toBeLessThanOrEqual(viewport.width);
    expect((await box(movesOn(page))).height).toBeGreaterThanOrEqual(100);
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight,
    );
    expect(scrolls).toBe(false);
  });
});

test.describe('on a phone', () => {
  test.use(PHONE);

  test('the panel is under the moves, and opening it leaves the board where it is, in view', async ({
    page,
  }) => {
    await startWithDelay(page, 400);
    await arriveAt(page, SICILIAN);
    const viewport = page.viewportSize() ?? { width: 0, height: 0 };
    const before = await box(boardOn(page));
    const moves = await box(movesOn(page));
    const shut = await box(panelOn(page));
    expect(shut.y).toBeGreaterThanOrEqual(moves.y + moves.height);

    // The line is playing while the panel is opened.
    await toggleOn(page).scrollIntoViewIfNeeded();
    const scrolledTo = await page.evaluate(() => window.scrollY);
    await toggleOn(page).click();
    await expect(panelOn(page).locator('.stats__length')).toBeVisible();

    expect(await page.evaluate(() => window.scrollY)).toBe(scrolledTo);
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await box(boardOn(page))).toEqual(before);
    expect(before.y + before.height).toBeLessThan(viewport.height);
    const open = await box(panelOn(page));
    expect(open.x).toBeGreaterThanOrEqual(0);
    expect(open.x + open.width).toBeLessThanOrEqual(viewport.width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
    await expect(pieceFrom(page, 'c7')).toHaveAttribute('data-square', 'c5');
  });
});
