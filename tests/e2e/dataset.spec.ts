import { expect, test } from '@playwright/test';

test('the production build ships the generated openings dataset', async ({ request }) => {
  const response = await request.get('/openings.json');

  expect(response.ok()).toBe(true);
  const payload = await response.json();
  const [encyclopaedia, wikibooks] = payload.collections;
  expect(payload.collections).toHaveLength(2);
  expect(encyclopaedia.id).toBe('eco');
  expect(encyclopaedia.source.title).toBe('lichess-org/chess-openings');
  expect(encyclopaedia.openings.length).toBeGreaterThan(3800);
  expect(encyclopaedia.openings[0]).toEqual({
    id: 'amar-opening',
    eco: 'A00',
    name: 'Amar Opening',
    san: ['Nh3'],
    uci: ['g1h3'],
  });

  expect(wikibooks.id).toBe('wikibooks');
  expect(wikibooks.source).toEqual({
    title: 'Chess Opening Theory',
    url: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory',
    author: 'Wikibooks contributors',
    revision: expect.stringMatching(/^20\d\d-\d\d-\d\d$/),
    license: 'CC-BY-SA-4.0',
  });
  expect(wikibooks.openings.length).toBeGreaterThan(2500);
  expect(wikibooks.openings[0]).toEqual({
    id: expect.stringMatching(/^wikibooks-\d+$/),
    eco: expect.stringMatching(/^[A-E]\d\d$/),
    name: expect.any(String),
    san: expect.any(Array),
    uci: expect.any(Array),
    page: expect.any(Number),
  });
});

test('the production build ships what the games say of each line, at a glance', async ({
  request,
}) => {
  const [openings, statistics] = await Promise.all(
    ['/openings.json', '/statistics.json'].map(async (url) => {
      const response = await request.get(url);
      expect(response.ok()).toBe(true);
      return response.json();
    }),
  );

  expect(statistics.source).toEqual({
    title: 'lichess.org open database',
    url: 'https://database.lichess.org/',
    month: expect.stringMatching(/^20\d\d-\d\d$/),
    games: expect.any(Number),
    license: 'CC0-1.0',
  });
  expect(statistics.source.games).toBeGreaterThan(50_000_000);
  // The position every game begins in: its games are all of them.
  const [white, draws, black, expected] = statistics.positions[0];
  expect(white + draws + black).toBe(statistics.source.games);
  expect(expected).toBeGreaterThan(0);
  expect(statistics.positions.length).toBeGreaterThan(5000);
  for (const { id, openings: lines } of openings.collections) {
    expect(statistics.lines[id]).toHaveLength(lines.length);
  }
});
