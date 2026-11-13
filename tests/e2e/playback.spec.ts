import { expect, type Locator, test } from '@playwright/test';

async function centre(locator: Locator) {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error('element has no bounding box');
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

test('a move is demonstrated in order: highlight the piece, draw the arrow, move the piece', async ({
  page,
}) => {
  await page.goto('/');
  const board = page.getByRole('img', { name: 'Chess board' });
  const pawn = board.locator('.piece[data-piece="e2"]');
  const arrow = board.locator('.arrow[data-from="e2"][data-to="e4"]');

  // First the piece that is about to move is picked out — and nothing else has happened yet.
  await expect(board.locator('.square--highlight[data-square="e2"]')).toBeVisible();
  await expect(pawn).toHaveClass(/piece--lifted/);
  await expect(arrow).toHaveCount(0);
  await expect(pawn).toHaveAttribute('data-square', 'e2');

  // Lifted, it is still standing on its square.
  const lifted = await centre(pawn);
  const home = await centre(board.locator('.square[data-square="e2"]'));
  expect(lifted.x).toBeCloseTo(home.x, 0);
  expect(lifted.y).toBeCloseTo(home.y, 0);

  // Then an arrow shows where it is going, while it is still where it was.
  await expect(arrow).toBeVisible();
  await expect(pawn).toHaveAttribute('data-square', 'e2');

  // Then it goes there, and the arrow has done its job.
  await expect(pawn).toHaveAttribute('data-square', 'e4');
  await expect(arrow).toHaveCount(0);
  await expect(board.locator('.square--last-move')).toHaveCount(2);
  const target = await centre(board.locator('.square[data-square="e4"]'));
  await expect.poll(async () => (await centre(pawn)).y).toBeCloseTo(target.y, 0);

  // And the reply follows after the delay.
  await expect(board.locator('.square--highlight[data-square="e7"]')).toBeVisible();
});
