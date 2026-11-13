import { expect, test } from '@playwright/test';

test('the production build ships the generated openings dataset', async ({ request }) => {
  const response = await request.get('/openings.json');

  expect(response.ok()).toBe(true);
  const payload = await response.json();
  expect(payload.source.repository).toBe('lichess-org/chess-openings');
  expect(payload.openings.length).toBeGreaterThan(3800);
  expect(payload.openings[0]).toEqual({
    id: 'amar-opening',
    eco: 'A00',
    name: 'Amar Opening',
    san: ['Nh3'],
    uci: ['g1h3'],
  });
});
