import type { Locator, Page } from '@playwright/test';
import { delaySetting } from '../../src/settings.ts';

export const boardOn = (page: Page) => page.getByRole('img', { name: 'Chess board' });

/** The piece that started the game on `home`, wherever it is now. */
export const pieceFrom = (page: Page, home: string) =>
  boardOn(page).locator(`.piece[data-piece="${home}"]`);

export const squareOn = (page: Page, name: string) =>
  boardOn(page).locator(`.square[data-square="${name}"]`);

export const movesOn = (page: Page) => page.getByRole('region', { name: 'Moves' });

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
  await page.addInitScript(([key, saved]) => localStorage.setItem(key, saved), [
    delaySetting.key,
    String(delayMs),
  ] as const);
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
    let drawn: string | null = null;

    const text = (selector: string) => document.querySelector(selector)?.textContent ?? null;
    const arrowShown = () => {
      const arrow = document.querySelector<SVGElement>('.arrow');
      return arrow ? `${arrow.dataset.from}${arrow.dataset.to}` : null;
    };
    const record = (what: string) => {
      window.beats.push({
        what,
        arrow: arrowShown(),
        cursor: text('.move-list [aria-current="step"]'),
        pending: text('.move-list .move--pending'),
      });
    };

    new MutationObserver(() => {
      const highlight = document.querySelector<HTMLElement>('.square--highlight')?.dataset.square;
      if (highlight && highlight !== highlighted) record(`highlight ${highlight}`);
      highlighted = highlight;

      const arrow = arrowShown();
      if (arrow && arrow !== drawn) record(`arrow ${arrow}`);
      drawn = arrow;

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
