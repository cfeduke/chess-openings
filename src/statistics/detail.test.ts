import { describe, expect, it, vi } from 'vitest';
import { ITALIAN, NAJDORF, SMALL_DATASET } from '../../tests/support/openings.ts';
import {
  ITALIAN_DETAIL,
  NAJDORF_DETAIL,
  SMALL_DETAIL,
  SMALL_STATISTICS,
} from '../../tests/support/statistics.ts';
import type { DetailChunk, DetailIndex } from './data.ts';
import { againstRatings, createDetails, detailOf, ENOUGH_GAMES, scoreOf } from './detail.ts';
import { type LineNumbers, readStatistics } from './statistics.ts';

const INDEX = SMALL_STATISTICS.detail as DetailIndex;
const statistics = readStatistics(SMALL_STATISTICS, SMALL_DATASET.collections);

describe('detailOf', () => {
  const italian = detailOf(ITALIAN_DETAIL, INDEX);

  it('says, band by band, what share of the band’s games reach the position', () => {
    expect(italian.bands.map(({ name }) => name)).toEqual([
      'Under 1200',
      '1200–1599',
      '1600–1999',
      '2000–2399',
      '2400 and over',
    ]);
    expect(italian.bands.map(({ games }) => games)).toEqual([22_000, 10_000, 5_000, 1_800, 200]);
    expect(italian.bands.map(({ share }) => Number(share.toFixed(4)))).toEqual([
      0.11, 0.0333, 0.0167, 0.012, 0.004,
    ]);
  });

  it('and White’s score in each', () => {
    expect(italian.bands[0]?.whiteScore).toBeCloseTo(0.57, 10);
  });

  it('says the same speed by speed, calling each as lichess does', () => {
    expect(italian.speeds.map(({ name }) => name)).toEqual([
      'Bullet',
      'Blitz',
      'Rapid',
      'Classical',
    ]);
    expect(italian.speeds.map(({ games }) => games)).toEqual([20_000, 15_000, 3_500, 500]);
    expect(italian.speeds[0]?.share).toBeCloseTo(0.05, 10);
    expect(italian.speeds[3]?.share).toBeCloseTo(0.025, 10);
  });

  it('gives each move played next its share of the position’s games, and where it leads', () => {
    expect(italian.moves).toEqual([
      { san: 'Bc5', games: 20_000, share: 20_000 / 39_000, to: 7 },
      { san: 'Nf6', games: 12_000, share: 12_000 / 39_000, to: -1 },
      { san: 'Be7', games: 4_000, share: 4_000 / 39_000, to: -1 },
      { san: 'h6', games: 2_000, share: 2_000 / 39_000, to: -1 },
    ]);
  });

  it('says how many games made some other move, or none', () => {
    expect(italian.others).toEqual({ games: 1_000, share: 1_000 / 39_000 });
    expect(detailOf(NAJDORF_DETAIL, INDEX).others).toEqual({ games: 5, share: 0.25 });
  });

  it('says how long the games were, in moves, and what share were over within twenty', () => {
    expect(italian.meanMoves).toBe(34);
    expect(italian.short).toBeCloseTo(0.2, 10);
  });

  it('has no length, no scores and no shares of moves for a position no game reached', () => {
    const none = detailOf(SMALL_DETAIL[5] as DetailChunk[number], INDEX);

    expect(none.meanMoves).toBeUndefined();
    expect(none.short).toBeUndefined();
    expect(none.moves).toEqual([]);
    expect(none.others).toEqual({ games: 0, share: 0 });
    expect(
      none.bands.every(({ games, whiteScore }) => games === 0 && whiteScore === undefined),
    ).toBe(true);
  });
});

describe('scoreOf', () => {
  it('is White’s score, where there are games enough to carry one', () => {
    expect(ENOUGH_GAMES).toBe(1000);
    expect(scoreOf({ games: 1000, whiteScore: 0.52 })).toBe(0.52);
    expect(scoreOf(statistics.of(ITALIAN) as LineNumbers)).toBeCloseTo(20_500 / 39_000, 10);
  });

  it('is nothing for fewer', () => {
    expect(scoreOf({ games: 999, whiteScore: 0.52 })).toBeUndefined();
    expect(scoreOf(statistics.of(NAJDORF) as LineNumbers)).toBeUndefined();
    expect(scoreOf({ games: 0 })).toBeUndefined();
  });
});

describe('againstRatings', () => {
  const { total } = statistics;
  /** `games` games in which White scored `score` where the ratings predicted `predicted`. */
  const numbers = (games: number, score: number, predicted: number): LineNumbers => ({
    games,
    share: games / total.games,
    white: games * score,
    draws: 0,
    black: games * (1 - score),
    expected: games * predicted,
    whiteScore: score,
    drawn: 0,
    edge: score - predicted,
  });

  it('sets White’s score against the ratings, and that against all games', () => {
    // Over all the small statistics' games White does 1.5 points better than predicted.
    expect(againstRatings(numbers(1_000_000, 0.56, 0.5), total)).toBe(
      'The players’ ratings predicted 50.0% for White, who scored 56.0%: 6.0 points more. ' +
        'Over all games White does 1.5 points better than predicted, ' +
        'so the opening is doing well for White.',
    );
  });

  it('says so when it is Black the opening does well for', () => {
    expect(againstRatings(numbers(1_000_000, 0.5, 0.52), total)).toBe(
      'The players’ ratings predicted 52.0% for White, who scored 50.0%: 2.0 points less. ' +
        'Over all games White does 1.5 points better than predicted, ' +
        'so the opening is doing well for Black.',
    );
  });

  it('counts doing better than predicted, but by less than White does everywhere, as Black’s', () => {
    expect(againstRatings(numbers(1_000_000, 0.505, 0.5), total)).toMatch(
      /: 0\.5 points more\. .* so the opening is doing well for Black\.$/,
    );
  });

  it('gives neither side the opening when the difference is what chance would do', () => {
    // Over 10,000 games a score is good to about half a point either way; twice that is chance.
    expect(againstRatings(numbers(10_000, 0.52, 0.5), total)).toBe(
      'The players’ ratings predicted 50.0% for White, who scored 52.0%: 2.0 points more. ' +
        'Over all games White does 1.5 points better than predicted, ' +
        'and over 10,000 games the difference could be chance.',
    );
    expect(againstRatings(numbers(10_000, 0.535, 0.5), total)).toMatch(/doing well for White\.$/);
  });

  it('says an even score evenly', () => {
    expect(againstRatings(numbers(1_000_000, 0.515, 0.5), total)).toMatch(
      /: 1\.5 points more\. .*and over 1,000,000 games the difference could be chance\.$/,
    );
  });

  it('has nothing to say of fewer games than can carry a score', () => {
    expect(againstRatings(numbers(999, 0.9, 0.5), total)).toBeUndefined();
    expect(againstRatings(statistics.of(NAJDORF) as LineNumbers, total)).toBeUndefined();
  });
});

describe('createDetails', () => {
  const index: DetailIndex = { ...INDEX, size: 4 };
  /** Three files of four positions, of which the Italian (6) is the third of the second. */
  const chunkOf = (chunk: number) => SMALL_DETAIL.slice(chunk * 4, chunk * 4 + 4);

  it('fetches the file a position is in, and reads the position out of it', async () => {
    const load = vi.fn(async (chunk: number) => chunkOf(chunk));
    const details = createDetails(index, load);

    expect(await details(6)).toEqual(detailOf(ITALIAN_DETAIL, index));
    expect(load).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('fetches nothing until it is asked', () => {
    const load = vi.fn(async (chunk: number) => chunkOf(chunk));

    createDetails(index, load);

    expect(load).not.toHaveBeenCalled();
  });

  it('fetches a file once, however many of its positions are asked for', async () => {
    const load = vi.fn(async (chunk: number) => chunkOf(chunk));
    const details = createDetails(index, load);

    await Promise.all([details(6), details(4), details(6)]);
    await details(5);
    await details(9);

    expect(load.mock.calls).toEqual([[1], [2]]);
  });

  it('fails when the file cannot be had, and asks again the next time', async () => {
    const load = vi
      .fn<(chunk: number) => Promise<DetailChunk>>()
      .mockRejectedValueOnce(new Error('statistics/1.json: HTTP 503'))
      .mockImplementation(async (chunk) => chunkOf(chunk));
    const details = createDetails(index, load);

    await expect(details(6)).rejects.toThrow('503');
    expect(await details(6)).toEqual(detailOf(ITALIAN_DETAIL, index));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['is not the file', { not: 'a chunk' }],
    ['has no such position', []],
    ['has something else in the position’s place', [null, null, { bands: 'no' }, null]],
  ])('fails when what comes %s', async (_, chunk) => {
    const details = createDetails(index, async () => chunk as unknown as DetailChunk);

    await expect(details(6)).rejects.toThrow(/detail/);
  });
});
