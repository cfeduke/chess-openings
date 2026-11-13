/** Deep links: the opening on show is named in the address, as `#/<opening id>`. */

const OPENING_HASH = /^#\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

export function hashForOpening(id: string): string {
  return `#/${id}`;
}

/** The opening id a location hash names, or null if it names none. */
export function openingIdFromHash(hash: string): string | null {
  return hash.match(OPENING_HASH)?.[1] ?? null;
}
