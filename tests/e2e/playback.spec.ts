import { expect, test } from '@playwright/test';
import {
  beatsOn,
  boardOn,
  centre,
  pieceFrom,
  recordBeats,
  squareOn,
  startWithDelay,
} from './support.ts';

test('a move is demonstrated in order: highlight the piece, draw the arrow, move the piece', async ({
  page,
}) => {
  await recordBeats(page);
  await startWithDelay(page, 500);
  await page.goto('/#/italian-game');

  // Let White's first move and Black's reply play.
  await expect(pieceFrom(page, 'e7')).toHaveAttribute('data-square', 'e5');

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

  // Where the piece came to rest, and the tint on the squares of the last move.
  const target = await centre(squareOn(page, 'e5'));
  await expect.poll(async () => (await centre(pieceFrom(page, 'e7'))).y).toBeCloseTo(target.y, 0);
  expect((await centre(pieceFrom(page, 'e7'))).x).toBeCloseTo(target.x, 0);
  await expect(boardOn(page).locator('.square--last-move')).toHaveCount(2);
});

test('the piece about to move is lifted where it stands', async ({ page }) => {
  await startWithDelay(page, 900);
  await page.goto('/#/italian-game');

  // Measured inside the page a quarter of a second after the highlight appears: by then the
  // piece has finished rising, and the move itself is still a while off.
  const lift = await page.evaluate(
    () =>
      new Promise<{ offCentreX: number; offCentreY: number; growth: number }>((resolve) => {
        const look = () => {
          const square = document.querySelector('.square--highlight');
          if (!square) return requestAnimationFrame(look);
          setTimeout(() => {
            const piece = document.querySelector('.piece--lifted')?.getBoundingClientRect();
            const home = square.getBoundingClientRect();
            if (!piece) throw new Error('no piece is lifted');
            resolve({
              offCentreX: piece.x + piece.width / 2 - (home.x + home.width / 2),
              offCentreY: piece.y + piece.height / 2 - (home.y + home.height / 2),
              growth: piece.width / home.width,
            });
          }, 250);
        };
        look();
      }),
  );

  expect(lift.growth).toBeGreaterThan(1.1);
  expect(lift.offCentreX).toBeCloseTo(0, 0);
  expect(lift.offCentreY).toBeCloseTo(0, 0);
});
