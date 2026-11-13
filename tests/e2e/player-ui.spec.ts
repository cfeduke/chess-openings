import { expect, test } from '@playwright/test';
import { boardOn, box, startWithDelay } from './support.ts';

test.describe('layout', () => {
  test('the moves are listed to the right of the board, and the controls run along the bottom', async ({
    page,
  }) => {
    await page.goto('/');
    const board = await box(boardOn(page));
    const moves = await box(page.getByRole('region', { name: 'Moves' }));
    const transport = await box(page.getByRole('group', { name: 'Player controls' }));
    const viewport = page.viewportSize();

    expect(moves.x).toBeGreaterThanOrEqual(board.x + board.width);
    expect(moves.y).toBeLessThan(board.y + board.height);
    expect(transport.y).toBeGreaterThanOrEqual(board.y + board.height);
    expect(transport.y + transport.height).toBeCloseTo(viewport?.height ?? 0, 0);
    expect(transport.width).toBeCloseTo(viewport?.width ?? 0, 0);
  });
});

test.describe('the move list', () => {
  test('its cursor follows the pieces', async ({ page }) => {
    await startWithDelay(page, 900);
    await page.goto('/');
    const board = boardOn(page);
    const moves = page.getByRole('region', { name: 'Moves' });
    const current = moves.locator('[aria-current="step"]');

    // Before anything has moved the cursor is on the start.
    await expect(current).toHaveText('Start');

    // While the board points the first move out, the list marks it as coming — not as made.
    await expect(board.locator('.square--highlight[data-square="e2"]')).toBeVisible();
    await expect(moves.locator('.move--pending')).toHaveText('e4');
    await expect(current).toHaveText('Start');

    // The piece moves, and the cursor with it.
    await expect(board.locator('.piece[data-piece="e2"]')).toHaveAttribute('data-square', 'e4');
    await expect(current).toHaveText('e4');
    await expect(current).toHaveAccessibleName('1. e4');
    const pointer = await current.evaluate((move) => getComputedStyle(move, '::before').content);
    expect(pointer).not.toBe('none');

    await expect(board.locator('.piece[data-piece="e7"]')).toHaveAttribute('data-square', 'e5');
    await expect(current).toHaveText('e5');
  });

  test('clicking a move jumps the board to the position after it', async ({ page }) => {
    await startWithDelay(page, 5000);
    await page.goto('/');
    const board = boardOn(page);
    const moves = page.getByRole('region', { name: 'Moves' });

    await moves.getByRole('button', { name: '2… Nc6' }).click();

    await expect(board.locator('.piece[data-piece="b8"]')).toHaveAttribute('data-square', 'c6');
    await expect(board.locator('.piece[data-piece="g1"]')).toHaveAttribute('data-square', 'f3');
    await expect(board.locator('.piece[data-piece="f1"]')).toHaveAttribute('data-square', 'f1');
    await expect(moves.locator('[aria-current="step"]')).toHaveText('Nc6');

    await moves.getByRole('button', { name: 'Start position' }).click();

    await expect(board.locator('.piece[data-piece="e2"]')).toHaveAttribute('data-square', 'e2');
  });
});

test.describe('the delay slider', () => {
  test('starts at a second and a half, sets the pace, and is remembered', async ({ page }) => {
    await page.goto('/');
    const slider = page.getByRole('slider', { name: 'Delay between moves' });
    const readout = page.locator('output');
    await expect(slider).toHaveValue('1500');
    await expect(readout).toHaveText('1.5 s');

    await slider.fill('300');

    // At the default pace the five moves take seven and a half seconds; now they fly by.
    await expect(readout).toHaveText('0.3 s');
    await expect(boardOn(page).locator('.piece[data-piece="f1"]')).toHaveAttribute(
      'data-square',
      'c4',
      {
        timeout: 3000,
      },
    );

    await page.reload();

    await expect(slider).toHaveValue('300');
    await expect(readout).toHaveText('0.3 s');
  });
});

test.describe('the buttons and keys', () => {
  test('pause, step, jump and play again', async ({ page }) => {
    await startWithDelay(page, 5000);
    await page.goto('/');
    const board = boardOn(page);
    const controls = page.getByRole('group', { name: 'Playback' });
    const pawn = board.locator('.piece[data-piece="e2"]');
    const bishop = board.locator('.piece[data-piece="f1"]');

    await controls.getByRole('button', { name: 'Pause' }).click();
    await expect(controls.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await expect(controls.getByRole('button', { name: 'Step back' })).toBeDisabled();

    await controls.getByRole('button', { name: 'Step forward' }).click();
    await expect(pawn).toHaveAttribute('data-square', 'e4');

    await controls.getByRole('button', { name: 'Step back' }).click();
    await expect(pawn).toHaveAttribute('data-square', 'e2');

    await controls.getByRole('button', { name: 'Jump to end' }).click();
    await expect(bishop).toHaveAttribute('data-square', 'c4');
    await expect(controls.getByRole('button', { name: 'Step forward' })).toBeDisabled();

    await controls.getByRole('button', { name: 'Play again' }).click();
    await expect(bishop).toHaveAttribute('data-square', 'f1');
    await expect(controls.getByRole('button', { name: 'Pause' })).toBeVisible();
  });

  test('the keyboard does the same', async ({ page }) => {
    await startWithDelay(page, 5000);
    await page.goto('/');
    const board = boardOn(page);
    const controls = page.getByRole('group', { name: 'Playback' });
    const pawn = board.locator('.piece[data-piece="e2"]');

    await page.keyboard.press('Space');
    await expect(controls.getByRole('button', { name: 'Play', exact: true })).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(pawn).toHaveAttribute('data-square', 'e4');

    await page.keyboard.press('ArrowLeft');
    await expect(pawn).toHaveAttribute('data-square', 'e2');

    await page.keyboard.press('End');
    await expect(board.locator('.piece[data-piece="f1"]')).toHaveAttribute('data-square', 'c4');

    await page.keyboard.press('Home');
    await expect(pawn).toHaveAttribute('data-square', 'e2');

    await page.keyboard.press('Space');
    await expect(controls.getByRole('button', { name: 'Pause' })).toBeVisible();
  });

  test('sound can be switched off, and stays off', async ({ page }) => {
    await page.goto('/');
    const sound = page.getByRole('button', { name: 'Sound' });
    await expect(sound).toHaveAttribute('aria-pressed', 'true');

    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'false');

    await page.reload();
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
  });

  test('the board can be turned around', async ({ page }) => {
    await page.goto('/');
    const board = boardOn(page);

    await page.getByRole('button', { name: 'Flip board' }).click();

    const whole = await box(board);
    const a1 = await box(board.locator('.square[data-square="a1"]'));
    expect(a1.x + a1.width).toBeCloseTo(whole.x + whole.width, 0);
    expect(a1.y).toBeCloseTo(whole.y, 0);
  });
});
