import { describe, expect, it } from 'vitest';
import { SMALL_STATISTICS } from '../../tests/support/statistics.ts';
import type { MostPlayedData } from './data.ts';
import { bandNames, rankMostPlayed } from './most-played.ts';

const DATA = SMALL_STATISTICS.mostPlayed as MostPlayedData;
const order = (band?: number, limit?: number) =>
  rankMostPlayed(DATA, band, limit).map((family) => family.opening);

describe('rankMostPlayed', () => {
  it('ranks the families by the share of all games that reach them', () => {
    expect(order()).toEqual([
      'slav-defense',
      'sicilian-defense',
      'scandinavian-defense',
      'italian-game',
      'polish-opening',
    ]);
  });

  it('says of each how many games reached it, their share, and White’s score', () => {
    const [slav, , , italian] = rankMostPlayed(DATA);

    expect(slav).toMatchObject({ opening: 'slav-defense', games: 150_000 });
    expect(slav?.share).toBeCloseTo(0.15, 10);
    expect(slav?.whiteScore).toBeCloseTo(0.52, 10);
    expect(italian?.whiteScore).toBeCloseTo(0.57, 10);
  });

  it('ranks the same families by the games of one band, as a share of that band’s', () => {
    expect(order(0)).toEqual([
      'scandinavian-defense',
      'italian-game',
      'slav-defense',
      'sicilian-defense',
      'polish-opening',
    ]);
    expect(order(4)).toEqual([
      'slav-defense',
      'sicilian-defense',
      'scandinavian-defense',
      'italian-game',
      'polish-opening',
    ]);

    const [scandinavian] = rankMostPlayed(DATA, 0);
    expect(scandinavian).toMatchObject({ games: 30_000 });
    expect(scandinavian?.share).toBeCloseTo(0.15, 10);
  });

  it('keeps the order they came in for families that are level', () => {
    const level: MostPlayedData = {
      ...DATA,
      families: ['b', 'a', 'c'].map((opening) => ({ opening, counts: [[1, 0, 1]] })),
    };

    expect(rankMostPlayed(level, 0).map((family) => family.opening)).toEqual(['b', 'a', 'c']);
  });

  it('stops at as many as it is asked for: twenty, unless told', () => {
    const many: MostPlayedData = {
      ...DATA,
      families: Array.from({ length: 30 }, (_, index) => ({
        opening: `family-${index}`,
        counts: [[30 - index, 0, 0]],
      })),
    };

    expect(order(undefined, 3)).toEqual([
      'slav-defense',
      'sicilian-defense',
      'scandinavian-defense',
    ]);
    expect(rankMostPlayed(many, 0)).toHaveLength(20);
  });

  it('has no score for a family none of the band’s games reached', () => {
    const unplayed: MostPlayedData = {
      ...DATA,
      families: [{ opening: 'polish-opening', counts: [[0, 0, 0]] }],
    };

    expect(rankMostPlayed(unplayed, 0)).toEqual([
      { opening: 'polish-opening', games: 0, share: 0 },
    ]);
  });
});

describe('bandNames', () => {
  it('say what each band of strength is, from its floor and the next one’s', () => {
    expect(bandNames([0, 1200, 1600, 2000, 2400])).toEqual([
      'Under 1200',
      '1200–1599',
      '1600–1999',
      '2000–2399',
      '2400 and over',
    ]);
  });
});
