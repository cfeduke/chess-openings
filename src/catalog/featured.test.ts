import { describe, expect, it } from 'vitest';
import { realOpenings } from '../../tests/support/real-openings.ts';
import { buildCatalog } from './catalog.ts';
import { FEATURED_OPENINGS, featuredOpenings } from './featured.ts';

describe('the well-known openings offered to a first-time visitor', () => {
  it('all exist in the dataset, and are offered in the order they are listed', () => {
    const featured = featuredOpenings(buildCatalog(realOpenings));

    expect(featured.map((opening) => opening.id)).toEqual([...FEATURED_OPENINGS]);
  });
});
