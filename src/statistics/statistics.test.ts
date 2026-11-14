import { describe, expect, it } from 'vitest';
import { ITALIAN, NAJDORF, opening, SMALL_DATASET } from '../../tests/support/openings.ts';
import { DANISH, TWO_COLLECTIONS } from '../../tests/support/pamphlet.ts';
import { SMALL_STATISTICS } from '../../tests/support/statistics.ts';
import type { StatisticsData } from './data.ts';
import { readStatistics } from './statistics.ts';

const find = (id: string) => {
  const found = SMALL_DATASET.collections[0]?.openings.find((opening) => opening.id === id);
  if (!found) throw new Error(`no ${id}`);
  return found;
};

describe('readStatistics', () => {
  const statistics = readStatistics(SMALL_STATISTICS, TWO_COLLECTIONS.collections);

  it('says where the games are from and how many were counted', () => {
    expect(statistics.source).toBe(SMALL_STATISTICS.source);
    expect(statistics.total.games).toBe(1_000_000);
  });

  it('says, of an opening, how many games reached it and what share of all games that is', () => {
    expect(statistics.of(ITALIAN)).toMatchObject({ games: 39_000, share: 0.039 });
    expect(statistics.of(NAJDORF)).toMatchObject({ games: 20, share: 0.00002 });
  });

  it('says how they went: White’s wins, the draws, Black’s wins', () => {
    expect(statistics.of(ITALIAN)).toMatchObject({ white: 20_000, draws: 1_000, black: 18_000 });
  });

  it('says White’s score, counting a draw as half, and the share drawn', () => {
    const italian = statistics.of(ITALIAN);

    expect(italian?.whiteScore).toBeCloseTo(20_500 / 39_000, 10);
    expect(italian?.drawn).toBeCloseTo(1_000 / 39_000, 10);
  });

  it('says White’s score less what the ratings predicted', () => {
    expect(statistics.of(ITALIAN)?.edge).toBeCloseTo((20_500 - 19_500) / 39_000, 10);
  });

  it('says the same of all games, which is what any opening is held against', () => {
    expect(statistics.total).toMatchObject({ games: 1_000_000, share: 1 });
    expect(statistics.total.whiteScore).toBeCloseTo(0.52, 10);
    expect(statistics.total.edge).toBeCloseTo(0.015, 10);
  });

  it('has a count, but no scores, for an opening no game reached', () => {
    expect(statistics.of(find('sicilian-defense-najdorf-variation-english-attack'))).toEqual({
      games: 0,
      share: 0,
      white: 0,
      draws: 0,
      black: 0,
      expected: 0,
    });
  });

  it('has nothing for an opening the tallies do not know', () => {
    expect(statistics.of(find('four-knights-game-italian-variation'))).toBeUndefined();
    expect(statistics.of(opening('A00', 'Never Heard Of', 'a3'))).toBeUndefined();
  });

  it('has numbers for the openings of every collection', () => {
    expect(statistics.of(DANISH)).toMatchObject({ games: 600 });
  });

  it('gives lines that end in the same position the same numbers', () => {
    const shared: StatisticsData = {
      ...SMALL_STATISTICS,
      lines: { eco: [3, 3, 3, 3, 3, 3, 3, 3, 3] },
    };
    const both = readStatistics(shared, SMALL_DATASET.collections);

    expect(both.of(ITALIAN)).toEqual(both.of(NAJDORF));
    expect(both.of(ITALIAN)?.games).toBe(92_000);
  });

  it('has nothing for a collection it lists a different number of lines for', () => {
    const stale: StatisticsData = { ...SMALL_STATISTICS, lines: { eco: [1, 2, 3] } };

    expect(readStatistics(stale, SMALL_DATASET.collections).of(ITALIAN)).toBeUndefined();
  });

  it('says which position an opening ends in, by its place among the positions counted', () => {
    expect(statistics.placeOf(ITALIAN)).toBe(6);
    expect(statistics.placeOf(DANISH)).toBe(9);
    expect(statistics.placeOf(find('four-knights-game-italian-variation'))).toBeUndefined();
    expect(statistics.placeOf(opening('A00', 'Never Heard Of', 'a3'))).toBeUndefined();
  });

  it('says which openings end in a position, in the order of the catalog', () => {
    expect(statistics.linesAt(6)).toEqual([ITALIAN]);
    expect(statistics.linesAt(9)).toEqual([DANISH]);
    expect(statistics.linesAt(-1)).toEqual([]);
    expect(statistics.linesAt(400)).toEqual([]);

    const shared: StatisticsData = {
      ...SMALL_STATISTICS,
      lines: { eco: [3, 3, 1, 1, 1, 1, 1, 1, 1] },
    };
    expect(
      readStatistics(shared, SMALL_DATASET.collections)
        .linesAt(3)
        .map((line) => line.name),
    ).toEqual(['Polish Opening', 'Scandinavian Defense']);
  });

  it('says how the detail of each position is to be had, if it came with that', () => {
    const { detail: _, ...glance } = SMALL_STATISTICS;

    expect(statistics.detail).toBe(SMALL_STATISTICS.detail);
    expect(readStatistics(glance, SMALL_DATASET.collections).detail).toBeUndefined();
    expect(
      readStatistics(
        { ...SMALL_STATISTICS, detail: { size: 0 } } as unknown as StatisticsData,
        SMALL_DATASET.collections,
      ).detail,
    ).toBeUndefined();
  });

  it.each([
    ['nothing', null],
    ['a page of HTML', '<!doctype html>'],
    ['no positions', { ...SMALL_STATISTICS, positions: undefined }],
    ['no games at all', { ...SMALL_STATISTICS, positions: [[0, 0, 0, 0]] }],
    ['no source', { ...SMALL_STATISTICS, source: undefined }],
    ['no lines', { ...SMALL_STATISTICS, lines: undefined }],
  ])('refuses %s', (_, data) => {
    expect(() =>
      readStatistics(data as unknown as StatisticsData, SMALL_DATASET.collections),
    ).toThrow(/statistics/);
  });
});
