import { expect, test } from '@playwright/test';
import {
  beatsOn,
  boardOn,
  box,
  movesOn,
  pieceFrom,
  recordBeats,
  squareOn,
  startWithDelay,
} from './support.ts';

test.describe('layout', () => {
  test('the moves are listed to the right of the board, and the controls run along the bottom', async ({
    page,
  }) => {
    await page.goto('/');
    const board = await box(boardOn(page));
    const moves = await box(movesOn(page));
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
    await recordBeats(page);
    await startWithDelay(page, 500);
    await page.goto('/');
    const current = movesOn(page).locator('[aria-current="step"]');

    await expect(pieceFrom(page, 'e7')).toHaveAttribute('data-square', 'e5');

    // While the board points a move out the list marks it as coming, not as made; the cursor
    // moves when the piece does.
    const beats = (await beatsOn(page)).slice(0, 6);
    expect(beats.map(({ what, cursor, pending }) => ({ what, cursor, pending }))).toEqual([
      { what: 'highlight e2', cursor: 'Start', pending: 'e4' },
      { what: 'arrow e2e4', cursor: 'Start', pending: 'e4' },
      { what: 'move e2e4', cursor: 'e4', pending: null },
      { what: 'highlight e7', cursor: 'e4', pending: 'e5' },
      { what: 'arrow e7e5', cursor: 'e4', pending: 'e5' },
      { what: 'move e7e5', cursor: 'e5', pending: null },
    ]);

    // The cursor is a visible pointer, and says where it is to a screen reader.
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(current).toHaveAccessibleName(/^\d(\.|…) /);
    const pointer = await current.evaluate((move) => getComputedStyle(move, '::before').content);
    expect(pointer).not.toBe('none');
  });

  test('clicking a move jumps the board to the position after it', async ({ page }) => {
    await startWithDelay(page, 5000);
    await page.goto('/');
    const moves = movesOn(page);

    await moves.getByRole('button', { name: '2… Nc6' }).click();

    await expect(pieceFrom(page, 'b8')).toHaveAttribute('data-square', 'c6');
    await expect(pieceFrom(page, 'g1')).toHaveAttribute('data-square', 'f3');
    await expect(pieceFrom(page, 'f1')).toHaveAttribute('data-square', 'f1');
    await expect(moves.locator('[aria-current="step"]')).toHaveText('Nc6');

    await moves.getByRole('button', { name: 'Start position' }).click();

    await expect(pieceFrom(page, 'e2')).toHaveAttribute('data-square', 'e2');
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
    await expect(pieceFrom(page, 'f1')).toHaveAttribute('data-square', 'c4', {
      timeout: 3000,
    });

    await page.reload();

    await expect(slider).toHaveValue('300');
    await expect(readout).toHaveText('0.3 s');
  });
});

test.describe('the buttons and keys', () => {
  test('pause, step, jump and play again', async ({ page }) => {
    await startWithDelay(page, 5000);
    await page.goto('/');
    const controls = page.getByRole('group', { name: 'Playback' });
    const pawn = pieceFrom(page, 'e2');
    const bishop = pieceFrom(page, 'f1');

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
    const controls = page.getByRole('group', { name: 'Playback' });
    const pawn = pieceFrom(page, 'e2');

    await page.keyboard.press('Space');
    await expect(controls.getByRole('button', { name: 'Play', exact: true })).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(pawn).toHaveAttribute('data-square', 'e4');

    await page.keyboard.press('ArrowLeft');
    await expect(pawn).toHaveAttribute('data-square', 'e2');

    await page.keyboard.press('End');
    await expect(pieceFrom(page, 'f1')).toHaveAttribute('data-square', 'c4');

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
    const a1 = await box(squareOn(page, 'a1'));
    expect(a1.x + a1.width).toBeCloseTo(whole.x + whole.width, 0);
    expect(a1.y).toBeCloseTo(whole.y, 0);
  });
});
