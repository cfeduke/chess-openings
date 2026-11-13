import { expect, test } from '@playwright/test';
import { pieceFrom, startWithDelay } from './support.ts';

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
  await startWithDelay(page, 400);
  await page.goto('/');
  const pawn = pieceFrom(page, 'e2');

  // The first move is made in silence: nobody has touched the page yet.
  await expect(pawn).toHaveAttribute('data-square', 'e4');
  expect(await page.evaluate(() => window.soundsStarted)).toBe(0);

  // A click anywhere is the gesture browsers ask for. The audio engine takes a moment to start,
  // so it may not be the very next move that is heard — but the line does not end in silence.
  await page.mouse.click(4, 4);
  await expect.poll(() => page.evaluate(() => window.soundsStarted)).toBeGreaterThan(0);
});
