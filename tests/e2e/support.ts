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
