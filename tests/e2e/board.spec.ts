import { expect, type Locator, test } from '@playwright/test';

async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error('element has no bounding box');
  return bounds;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('the board is a square of 64 squares with 32 pieces on it', async ({ page }) => {
  const board = page.getByRole('img', { name: 'Chess board' });

  await expect(board).toBeVisible();
  await expect(board.locator('.square')).toHaveCount(64);
  await expect(board.locator('.piece')).toHaveCount(32);
  const bounds = await box(board);
  expect(Math.abs(bounds.width - bounds.height)).toBeLessThan(1);
  expect(bounds.width).toBeGreaterThan(300);
});

test('every piece sits exactly on its starting square', async ({ page }) => {
  const board = page.getByRole('img', { name: 'Chess board' });

  for (const name of ['a1', 'e1', 'd8', 'h7', 'c2', 'g8']) {
    const square = await box(board.locator(`.square[data-square="${name}"]`));
    const piece = await box(board.locator(`.piece[data-square="${name}"]`));

    expect(Math.abs(piece.x - square.x), `${name} x`).toBeLessThan(1);
    expect(Math.abs(piece.y - square.y), `${name} y`).toBeLessThan(1);
    expect(Math.abs(piece.width - square.width), `${name} size`).toBeLessThan(1);
  }
});

test('White starts at the bottom, with a1 in the bottom-left corner', async ({ page }) => {
  const board = page.getByRole('img', { name: 'Chess board' });

  const whole = await box(board);
  const a1 = await box(board.locator('.square[data-square="a1"]'));
  const h8 = await box(board.locator('.square[data-square="h8"]'));

  expect(Math.abs(a1.x - whole.x)).toBeLessThan(1);
  expect(Math.abs(a1.y + a1.height - (whole.y + whole.height))).toBeLessThan(1);
  expect(Math.abs(h8.x + h8.width - (whole.x + whole.width))).toBeLessThan(1);
  expect(Math.abs(h8.y - whole.y)).toBeLessThan(1);
});

test('the pieces are drawn with real artwork', async ({ page }) => {
  const king = page.locator('.piece[data-piece="e1"]');

  const background = await king.evaluate((element) => getComputedStyle(element).backgroundImage);

  expect(background).toContain('svg');
});
