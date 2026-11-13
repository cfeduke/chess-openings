import { describe, expect, it } from 'vitest';
import { realOpenings } from '../../tests/support/real-openings.ts';
import { buildCatalog } from './catalog.ts';
import { FEATURED_OPENINGS, featuredOpenings } from './featured.ts';

describe('the well-known openings offered to a first-time visitor', () => {
  const featured = featuredOpenings(buildCatalog(realOpenings));

  it('are a handful, each offered once', () => {
    expect(FEATURED_OPENINGS.length).toBeGreaterThanOrEqual(6);
    expect(FEATURED_OPENINGS.length).toBeLessThanOrEqual(10);
    expect(new Set(FEATURED_OPENINGS).size).toBe(FEATURED_OPENINGS.length);
  });

  it('all exist in the dataset, in the order they are listed', () => {
    expect(featured.map((opening) => opening.id)).toEqual([...FEATURED_OPENINGS]);
  });

  it('start with the Italian Game and take in both 1. e4 and 1. d4', () => {
    expect(featured[0]?.name).toBe('Italian Game');
    expect(new Set(featured.map((opening) => opening.san[0]))).toEqual(new Set(['e4', 'd4']));
  });

  it('leave out any that a dataset no longer has, rather than failing', () => {
    const [first] = featured;

    expect(featuredOpenings(buildCatalog(first ? [first] : []))).toEqual(first ? [first] : []);
  });
});
