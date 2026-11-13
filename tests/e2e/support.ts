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
