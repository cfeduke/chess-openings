import { isSlug } from './text/slug.ts';

/** Deep links: the opening on show is named in the address, as `#/<opening id>`. */

const PREFIX = '#/';

export function hashForOpening(id: string): string {
  return PREFIX + id;
}

/** The opening id a location hash names, or null if it names none. */
export function openingIdFromHash(hash: string): string | null {
  const id = hash.startsWith(PREFIX) ? hash.slice(PREFIX.length) : '';
  return isSlug(id) ? id : null;
}
