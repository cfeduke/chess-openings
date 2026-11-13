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
