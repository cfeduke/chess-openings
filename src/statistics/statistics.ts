import type { Opening, OpeningCollection } from '../data/opening.ts';
import type { GamesSource, MostPlayedData, PositionCounts, StatisticsData } from './data.ts';

/** What the games that reached a position say of it. */
export interface LineNumbers {
  /** How many games reached it. */
  games: number;
  /** That, as a share of all the games counted: from 0 to 1. */
  share: number;
  /** Games White won. */
  white: number;
  draws: number;
  /** Games Black won. */
  black: number;
  /** What the players' ratings said White would score, added up. */
  expected: number;
  /** White's score, a draw counting as half: from 0 to 1. There is none without a game. */
  whiteScore?: number;
  /** The share of the games that were drawn. */
  drawn?: number;
  /**
   * White's score less what the ratings predicted. Over all games White does a little better
   * than predicted (`Statistics.total`), so this says something only against that.
   */
  edge?: number;
}

/** What the games say of the catalog's openings. */
export interface Statistics {
  source: GamesSource;
  /** The numbers of all the games counted, which an opening's are to be held against. */
  total: LineNumbers;
  /** What it takes to rank the families of one collection, if the statistics came with it. */
  mostPlayed?: MostPlayedData;
  /**
   * The numbers of the games that reached the position `opening` ends in — or nothing, if it was
   * not in the catalog when the games were counted, which is not the same as no game reaching it.
   */
  of(opening: Opening): LineNumbers | undefined;
}

/** What `counts` come to, as a share of `total` games. */
function numbersOf([white, draws, black, expected]: PositionCounts, total: number): LineNumbers {
  const games = white + draws + black;
  const numbers = { games, share: games / total, white, draws, black, expected };
  if (games === 0) return numbers;
  const points = white + draws / 2;
  return {
    ...numbers,
    whiteScore: points / games,
    drawn: draws / games,
    edge: (points - expected) / games,
  };
}

/** Whether `ranking` has what a ranking takes: a collection, and its families band by band. */
const isRanking = (ranking: MostPlayedData | undefined): ranking is MostPlayedData =>
  typeof ranking?.collection === 'string' &&
  Array.isArray(ranking.bands) &&
  Array.isArray(ranking.totals) &&
  Array.isArray(ranking.families);

function refuse(why: string): never {
  throw new Error(`the statistics are unreadable: ${why}`);
}

const isCounts = (counts: unknown): counts is PositionCounts =>
  Array.isArray(counts) && counts.length === 4 && counts.every(Number.isFinite);

/**
 * Makes `data` answer for the openings of `collections`. Throws if it is not statistics at all;
 * a collection it does not cover line for line simply has no numbers.
 */
export function readStatistics(data: StatisticsData, collections: OpeningCollection[]): Statistics {
  if (!data || typeof data !== 'object') refuse('not an object');
  const { source, positions, lines } = data;
  if (!source || typeof source.month !== 'string') refuse('no source');
  if (!Array.isArray(positions) || !positions.every(isCounts)) refuse('no positions');
  if (!lines || typeof lines !== 'object') refuse('no lines');

  const [all] = positions;
  if (!all) return refuse('no games');
  const total = all[0] + all[1] + all[2];
  if (total === 0) refuse('no games');

  const places = new Map<string, number>();
  for (const { id, openings } of collections) {
    const ends = lines[id];
    if (!Array.isArray(ends) || ends.length !== openings.length) continue;
    for (const [index, opening] of openings.entries()) places.set(opening.id, ends[index] ?? -1);
  }

  return {
    source,
    total: numbersOf(all, total),
    ...(isRanking(data.mostPlayed) && { mostPlayed: data.mostPlayed }),
    of(opening) {
      const counts = positions[places.get(opening.id) ?? -1];
      return counts && numbersOf(counts, total);
    },
  };
}
