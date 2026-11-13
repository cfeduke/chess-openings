import { expect, test } from '@playwright/test';
import { beatsOn, boardOn, centre, recordBeats, startWithDelay } from './support.ts';

test('a move is demonstrated in order: highlight the piece, draw the arrow, move the piece', async ({
  page,
}) => {
  await recordBeats(page);
  await startWithDelay(page, 500);
  await page.goto('/');
  const board = boardOn(page);

  // Let White's first move and Black's reply play.
  await expect(board.locator('.piece[data-piece="e7"]')).toHaveAttribute('data-square', 'e5');

  const beats = (await beatsOn(page)).slice(0, 6);
  expect(beats.map((beat) => beat.what)).toEqual([
    'highlight e2',
    'arrow e2e4',
    'move e2e4',
    'highlight e7',
    'arrow e7e5',
    'move e7e5',
  ]);
  // The arrow is not there yet when the piece is highlighted, and gone once it has moved.
  expect(beats.map((beat) => beat.arrow)).toEqual([null, 'e2e4', null, null, 'e7e5', null]);

  // Where the pieces came to rest, and the tint on the squares of the last move.
  const pawn = await centre(board.locator('.piece[data-piece="e7"]'));
  const target = await centre(board.locator('.square[data-square="e5"]'));
  await expect
    .poll(async () => (await centre(board.locator('.piece[data-piece="e7"]'))).y)
    .toBeCloseTo(target.y, 0);
  expect(pawn.x).toBeCloseTo(target.x, 0);
  await expect(board.locator('.square--last-move')).toHaveCount(2);
});

test('the piece about to move is lifted where it stands', async ({ page }) => {
  await startWithDelay(page, 5000);
  await page.goto('/');
  const board = boardOn(page);
  const pawn = board.locator('.piece[data-piece="e2"]');

  // At this pace the highlight stays up for three seconds: time to look at it properly.
  await expect(board.locator('.square--highlight[data-square="e2"]')).toBeVisible();
  await expect(pawn).toHaveClass(/piece--lifted/);

  const square = await board.locator('.square[data-square="e2"]').boundingBox();
  await expect
    .poll(async () => (await pawn.boundingBox())?.width)
    .toBeGreaterThan((square?.width ?? 0) * 1.1);
  const lifted = await centre(pawn);
  const home = await centre(board.locator('.square[data-square="e2"]'));
  expect(lifted.x).toBeCloseTo(home.x, 0);
  expect(lifted.y).toBeCloseTo(home.y, 0);
});
