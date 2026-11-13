import { expect, test } from '@playwright/test';
import { boardOn, box } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('the board is a square of 64 squares with 32 pieces on it', async ({ page }) => {
  const board = boardOn(page);

  await expect(board).toBeVisible();
  await expect(board.locator('.square')).toHaveCount(64);
  await expect(board.locator('.piece')).toHaveCount(32);
  const bounds = await box(board);
  expect(bounds.width).toBeCloseTo(bounds.height, 0);
  expect(bounds.width).toBeGreaterThan(300);
});

test('every piece sits exactly on its starting square', async ({ page }) => {
  const board = boardOn(page);

  for (const name of ['a1', 'e1', 'd8', 'h7', 'c2', 'g8']) {
    const square = await box(board.locator(`.square[data-square="${name}"]`));
    const piece = await box(board.locator(`.piece[data-square="${name}"]`));

    expect(piece.x, `${name} x`).toBeCloseTo(square.x, 0);
    expect(piece.y, `${name} y`).toBeCloseTo(square.y, 0);
    expect(piece.width, `${name} size`).toBeCloseTo(square.width, 0);
  }
});

test('White starts at the bottom, with a1 in the bottom-left corner', async ({ page }) => {
  const board = boardOn(page);

  const whole = await box(board);
  const a1 = await box(board.locator('.square[data-square="a1"]'));
  const h8 = await box(board.locator('.square[data-square="h8"]'));

  expect(a1.x).toBeCloseTo(whole.x, 0);
  expect(a1.y + a1.height).toBeCloseTo(whole.y + whole.height, 0);
  expect(h8.x + h8.width).toBeCloseTo(whole.x + whole.width, 0);
  expect(h8.y).toBeCloseTo(whole.y, 0);
});

test('the pieces are drawn with real artwork', async ({ page }) => {
  const king = boardOn(page).locator('.piece[data-piece="e1"]');

  const background = await king.evaluate((element) => getComputedStyle(element).backgroundImage);

  expect(background).toContain('svg');
});
