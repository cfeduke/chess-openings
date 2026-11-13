import type { Locator, Page } from '@playwright/test';

export const boardOn = (page: Page) => page.getByRole('img', { name: 'Chess board' });

/** Where an element is on the page. Fails if it is not rendered. */
export async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error('element has no bounding box');
  return bounds;
}

export async function centre(locator: Locator) {
  const { x, y, width, height } = await box(locator);
  return { x: x + width / 2, y: y + height / 2 };
}

/**
 * Makes the site start with this delay between moves, as if the visitor had chosen it on an
 * earlier visit. Call before `page.goto`. It applies to every load of the page, so a spec about
 * the delay being remembered must not use it.
 */
export async function startWithDelay(page: Page, delayMs: number) {
  await page.addInitScript((saved) => {
    localStorage.setItem('chess-openings.delayMs', saved);
  }, String(delayMs));
}

/** One thing that happened on the board, with what the rest of the page showed at that instant. */
export interface Beat {
  /** `highlight e2`, `arrow e2e4` or `move e2e4`. */
  what: string;
  /** The arrow on the board, as `e2e4`, or null. */
  arrow: string | null;
  /** The text of the move the move list's cursor is on. */
  cursor: string | null;
  /** The text of the move the move list marks as about to be made. */
  pending: string | null;
}

declare global {
  interface Window {
    beats: Beat[];
  }
}

/**
 * Records, inside the page, each beat of the demonstration the moment it happens. Checking
 * order from outside is a race against the clock; the page itself sees every change in turn.
 * Call before `page.goto`, and read the record with `beatsOn`.
 */
export async function recordBeats(page: Page) {
  await page.addInitScript(() => {
    window.beats = [];
    const squares = new Map<string, string>();
    let highlighted: string | undefined;
    let drawn: string | undefined;

    const text = (selector: string) => document.querySelector(selector)?.textContent ?? null;
    const record = (what: string) => {
      const arrow = document.querySelector<SVGElement>('.arrow');
      window.beats.push({
        what,
        arrow: arrow ? `${arrow.dataset.from}${arrow.dataset.to}` : null,
        cursor: text('.move-list [aria-current="step"]'),
        pending: text('.move-list .move--pending'),
      });
    };

    new MutationObserver(() => {
      const highlight = document.querySelector<HTMLElement>('.square--highlight')?.dataset.square;
      if (highlight && highlight !== highlighted) record(`highlight ${highlight}`);
      highlighted = highlight;

      const arrow = document.querySelector<SVGElement>('.arrow');
      const aim = arrow ? `${arrow.dataset.from}${arrow.dataset.to}` : undefined;
      if (aim && aim !== drawn) record(`arrow ${aim}`);
      drawn = aim;

      for (const piece of document.querySelectorAll<HTMLElement>('.piece[data-square]')) {
        const { piece: id = '', square = '' } = piece.dataset;
        const before = squares.get(id);
        if (before && before !== square) record(`move ${before}${square}`);
        squares.set(id, square);
      }
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'data-square'],
    });
  });
}

export const beatsOn = (page: Page) => page.evaluate(() => window.beats);
