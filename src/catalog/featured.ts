import type { Opening } from '../data/opening.ts';
import type { Catalog } from './catalog.ts';

/** The openings a newcomer is most likely to have heard of, by id: somewhere to start. */
export const FEATURED_OPENINGS = [
  'italian-game',
  'ruy-lopez',
  'sicilian-defense-najdorf-variation',
  'french-defense',
  'caro-kann-defense',
  'queens-gambit',
  'kings-indian-defense',
  'london-system',
] as const;

/** The featured openings that `catalog` has, in the order they are featured. */
export function featuredOpenings(catalog: Catalog): Opening[] {
  return FEATURED_OPENINGS.flatMap((id) => catalog.locate(id)?.opening ?? []);
}
