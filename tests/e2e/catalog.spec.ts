import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  boardOn,
  box,
  catalogOn,
  collectionTabOn,
  controlsOn,
  ITALIAN_GAME,
  movesOn,
  NAJDORF,
  openingNameOn,
  pieceFrom,
  startWithDelay,
  tabsOn,
  volumeTabsOn,
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
  await expect(tabsOn(page, 'Collections')).toHaveText(['ECO', 'Wikibooks']);
  await expect(tabsOn(page, 'Collections').first()).toHaveAttribute('aria-selected', 'true');
  await expect(volumeTabsOn(page)).toHaveText(['Top', 'A', 'B', 'C', 'D', 'E']);
  await expect(catalog.getByRole('searchbox', { name: 'Search openings' })).toHaveAttribute(
    'placeholder',
    /^Search 6,\d{3} openings$/,
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
  await expect(volumeTabsOn(page)).toHaveCount(6);

  expect(fetched).toHaveLength(1);
  await expect(page.locator('link[rel="preload"][as="fetch"]')).toHaveAttribute(
    'href',
    '/openings.json',
  );
});

test('a first-time visitor can start from one of the eight most played openings', async ({
  page,
}) => {
  await page.goto('/');
  const offered = page.getByRole('list', { name: 'Most played openings' });
  await expect(offered.getByRole('button')).toHaveText([
    'Sicilian Defense',
    'Scandinavian Defense',
    'French Defense',
    'Caro-Kann Defense',
    'Indian Defense',
    'Italian Game',
    'Zukertort Opening',
    'English Opening',
  ]);

  await offered.getByRole('button', { name: 'Italian Game' }).click();

  await expect(openingNameOn(page)).toHaveAccessibleName('C50 Italian Game');
  await expect(page).toHaveTitle('Italian Game (C50) — Chess Openings');
  await expect(pieceFrom(page, 'e2')).toHaveAttribute('data-square', 'e4');
  await expect(offered).toHaveCount(0);
});

test.describe('the most played openings', () => {
  const ranking = (page: Page) => catalogOn(page).getByRole('list', { name: 'Most played' });
  const names = (page: Page) => ranking(page).locator('.line__name');

  test('are the page a visitor arrives at: twenty families, ahead of the volumes', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(volumeTabsOn(page)).toHaveText(['Top', 'A', 'B', 'C', 'D', 'E']);
    await expect(
      catalogOn(page).getByRole('tab', { name: 'Top openings: Most played' }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(catalogOn(page).getByRole('heading', { level: 2 })).toHaveText('Most played');
    await expect(names(page)).toHaveCount(20);
    await expect(names(page).first()).toHaveText('Sicilian Defense');
    await expect(names(page).nth(1)).toHaveText('Scandinavian Defense');
    await expect(names(page).nth(2)).toHaveText('French Defense');
    // The ways in are not in it, however many games pass through them.
    await expect(ranking(page)).not.toContainText("King's Pawn Game");
    await expect(ranking(page)).not.toContainText("Queen's Gambit");
  });

  test('each has its rank, its moves, its share of games and White’s score', async ({ page }) => {
    await page.goto('/');
    const sicilian = ranking(page).getByRole('button').first();

    await expect(sicilian).toHaveAccessibleName(
      /^1 Sicilian Defense 1\. e4 c5 reached in 9\.2% of games White scores \d\d\.\d%$/,
    );
    await expect(sicilian.locator('.ranked__share')).toHaveText('9.2%');
    await expect(sicilian.locator('.meter__bar--on')).toHaveCount(4);
    await expect(sicilian.locator('.ranked__score')).toBeVisible();
  });

  test('choosing one puts it on the board, and it stays marked in the list', async ({ page }) => {
    await page.goto('/');

    await ranking(page)
      .getByRole('button', { name: /Caro-Kann Defense/ })
      .click();

    await expect(openingNameOn(page)).toHaveAccessibleName('B10 Caro-Kann Defense');
    await expect(pieceFrom(page, 'c7')).toHaveAttribute('data-square', 'c6');
    await expect(catalogOn(page).getByRole('tab', { name: /Volume B/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await catalogOn(page)
      .getByRole('tab', { name: /^Top openings/ })
      .click();
    await expect(ranking(page).locator('.line[aria-current="true"] .line__name')).toHaveText(
      'Caro-Kann Defense',
    );
  });

  test('are ranked again for the players of one strength, and the mark is kept', async ({
    page,
  }) => {
    await page.goto('/');
    const players = catalogOn(page).getByRole('combobox', { name: 'Players' });
    await expect(players).toHaveValue('');
    const all = await names(page).allTextContents();

    await players.selectOption({ label: 'Under 1200' });
    await expect(names(page).first()).toHaveText('Scandinavian Defense');
    await expect(names(page).nth(1)).toHaveText('Italian Game');
    await expect(ranking(page).getByRole('button').first()).toHaveAccessibleName(
      /reached in 7\.9% of games/,
    );

    await players.selectOption({ label: '2400 and over' });
    await expect(names(page).first()).toHaveText('Zukertort Opening');
    await expect(names(page).nth(1)).toHaveText('Sicilian Defense');
    await expect(names(page)).toHaveCount(20);

    await players.selectOption({ label: 'All players' });
    expect(await names(page).allTextContents()).toEqual(all);
  });

  test('can be reached, chosen from and ranked again with the keyboard alone', async ({ page }) => {
    await page.goto('/');
    await expect(names(page)).toHaveCount(20);
    await catalogOn(page)
      .getByRole('tab', { name: /^Top openings/ })
      .focus();

    await page.keyboard.press('ArrowRight');
    await expect(catalogOn(page).getByRole('tab', { name: /Volume A/ })).toBeFocused();
    await page.keyboard.press('Home');
    await expect(names(page)).toHaveCount(20);

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(catalogOn(page).getByRole('combobox', { name: 'Players' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(ranking(page).getByRole('button').first()).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(openingNameOn(page)).toHaveAccessibleName('B20 Sicilian Defense');
  });

  test('give way to the opening a link names', async ({ page }) => {
    await page.goto(NAJDORF);

    await expect(volumeTabsOn(page)).toHaveCount(6);
    await expect(catalogOn(page).getByRole('tab', { name: /Volume B/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('list', { name: 'Most played openings' })).toHaveCount(0);
  });

  test('are not there without the numbers: the catalog opens at volume A, with nothing offered', async ({
    page,
  }) => {
    const answered = page.waitForResponse('**/statistics.json');
    await page.route('**/statistics.json', (route) => route.fulfill({ status: 404, body: '' }));

    await page.goto('/');
    await answered;

    await expect(volumeTabsOn(page)).toHaveText(['A', 'B', 'C', 'D', 'E']);
    await expect(catalogOn(page).getByRole('tab', { name: /Volume A/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('heading', { name: 'Choose an opening' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Most played openings' })).toHaveCount(0);
  });
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

test.describe('how often each line is played', () => {
  const meterOf = (line: Locator) => line.locator('.meter');

  test('is on every line, browsed or found, as a meter and in words', async ({ page }) => {
    await page.goto('/');
    const catalog = catalogOn(page);

    await catalog.getByRole('tab', { name: /Volume B/ }).click();
    await catalog.getByRole('button', { name: /^B20–B29/ }).click();
    const sicilian = catalog.locator('.line[data-opening="sicilian-defense"]');
    await expect(meterOf(sicilian)).toHaveAttribute('title', '9.2% of games');
    await expect(sicilian).toHaveAccessibleName(
      'B20 Sicilian Defense: Main line 1. e4 c5 reached in 9.2% of games',
    );
    await expect(meterOf(sicilian).locator('.meter__bar--on')).toHaveCount(4);
    await expect(meterOf(sicilian)).toBeVisible();
    // Every line of the group has one: they were all counted.
    const lines = catalog.locator('.group__body:not([hidden]) .line');
    await expect(lines.locator('.meter')).toHaveCount(await lines.count());

    await catalog.getByRole('searchbox', { name: 'Search openings' }).fill('1. e4');
    const kingsPawn = catalog.locator('.line[data-opening="kings-pawn-game"]');
    await expect(meterOf(kingsPawn)).toHaveAttribute('title', '58% of games');
    await expect(meterOf(kingsPawn).locator('.meter__bar--on')).toHaveCount(5);
  });

  test('is the same for two lines that end in the same position', async ({ page }) => {
    await page.goto('/');
    const catalog = catalogOn(page);

    // The Wikibook's page for 1. e4 c5 and the encyclopaedia's Sicilian Defense.
    await catalog.getByRole('searchbox', { name: 'Search openings' }).fill('1. e4 c5');
    await expect(
      meterOf(catalog.locator('.catalog__results .line[data-opening="sicilian-defense"]')),
    ).toHaveAttribute('title', '9.2% of games');
    await collectionTabOn(page, 'Wikibooks').click();

    await expect(meterOf(catalog.locator('.line').first())).toHaveAttribute(
      'title',
      '9.2% of games',
    );
  });

  test('is credited under the catalog: the database, the month, the games', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.credits')).toContainText(
      /How often each is played: 94,074,706 games of October 2026 from the lichess\.org open database, in the public domain\./,
    );
  });

  test('is not waited for: the catalog is there while the numbers are still coming', async ({
    page,
  }) => {
    let send = () => {};
    const held = new Promise<void>((resolve) => {
      send = resolve;
    });
    await page.route('**/statistics.json', async (route) => {
      await held;
      await route.continue();
    });

    await page.goto(ITALIAN_GAME);
    const italian = catalogOn(page).locator('.line[aria-current="true"]');
    await expect(italian).toBeVisible();
    await expect(pieceFrom(page, 'e2')).toHaveAttribute('data-square', 'e4');
    await expect(page.locator('.meter')).toHaveCount(0);

    send();

    await expect(meterOf(italian)).toHaveAttribute('title', '3.9% of games');
    // The credit of the games takes room from the catalog: the line on the board stays in view.
    await expect(page.locator('.credits')).toContainText('How often');
    await expect(italian).toBeInViewport({ ratio: 1 });
  });

  for (const [what, respond] of [
    ['missing', { status: 404, body: 'Not found' }],
    ['unreadable', { status: 200, contentType: 'text/html', body: '<!doctype html>' }],
  ] as const) {
    test(`leaves the site as it was when the numbers are ${what}`, async ({ page }) => {
      const answered = page.waitForResponse('**/statistics.json');
      await page.route('**/statistics.json', (route) => route.fulfill(respond));

      await page.goto(ITALIAN_GAME);
      await answered;

      await expect(openingNameOn(page)).toHaveAccessibleName('C50 Italian Game');
      await expect(pieceFrom(page, 'e2')).toHaveAttribute('data-square', 'e4');
      await expect(catalogOn(page).locator('.line[aria-current="true"]')).toBeVisible();
      await expect(page.locator('.meter')).toHaveCount(0);
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.locator('.credits')).not.toContainText('How often');
    });
  }
});
