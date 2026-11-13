import { expect, test } from '@playwright/test';
import { boardOn } from './support.ts';

declare global {
  interface Window {
    /** Set by the spec: how many sound sources the page has started. */
    soundsStarted: number;
  }
}

test('moves are heard once the visitor has interacted with the page, and not before', async ({
  page,
}) => {
  // Count every oscillator and noise burst the page starts.
  await page.addInitScript(() => {
    window.soundsStarted = 0;
    const start = AudioScheduledSourceNode.prototype.start;
    AudioScheduledSourceNode.prototype.start = function (...args) {
      window.soundsStarted += 1;
      return start.apply(this, args);
    };
  });
  await page.goto('/');
  const board = boardOn(page);
  const pawn = board.locator('.piece[data-piece="e2"]');

  // The first move is made in silence: nobody has touched the page yet.
  await expect(pawn).toHaveAttribute('data-square', 'e4');
  expect(await page.evaluate(() => window.soundsStarted)).toBe(0);

  // A click anywhere is the gesture browsers ask for. The next move can be heard.
  await page.mouse.click(4, 4);
  await expect(board.locator('.piece[data-piece="e7"]')).toHaveAttribute('data-square', 'e5');
  expect(await page.evaluate(() => window.soundsStarted)).toBeGreaterThan(0);
});
