import type { DetailChunk, DetailIndex, Outcomes, PositionDetail } from './data.ts';
import { bandNames } from './most-played.ts';
import { type LineNumbers, numbersOf } from './statistics.ts';

/**
 * How few games are too few for a score. A game's result has a standard deviation of about half
 * a point, so a score over a thousand games is good to about 1.6 points either way — which is
 * the whole of White's edge.
 */
export const ENOUGH_GAMES = 1000;

/** White's score in some games, where there are enough of them to carry one. */
export const scoreOf = ({ games, whiteScore }: Pick<LineNumbers, 'games' | 'whiteScore'>) =>
  games >= ENOUGH_GAMES ? whiteScore : undefined;

/** The games of one band, or one speed, that reached a position. */
export interface Split {
  /** What the band or the speed is called. */
  name: string;
  games: number;
  /** Them as a share of all the games of that band or speed: from 0 to 1. */
  share: number;
  /** White's score in them. There is none without a game. */
  whiteScore?: number;
}

/** A move played from a position. */
export interface NextMove {
  san: string;
  /** The games it was played in. */
  games: number;
  /** Them as a share of the games that reached the position. */
  share: number;
  /** The place of the position it leads to, or `-1` if that is not one games were counted for. */
  to: number;
}

/** What there is to say of the opening on the board beyond the glance. */
export interface OpeningDetail {
  /** Who plays it: band by band, the weakest first. */
  bands: Split[];
  /** At what speed: the fastest first. */
  speeds: Split[];
  /** What is played next: the moves most played, the most played first. */
  moves: NextMove[];
  /** The games in which some move not listed was played, or none. */
  others: { games: number; share: number };
  /** How long the games were on average, in moves of both sides together. None without a game. */
  meanMoves?: number;
  /** The share of the games that were over within twenty moves. */
  short?: number;
}

const capitalised = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

const gamesOf = ([white, draws, black]: Outcomes) => white + draws + black;

function splits(names: string[], counts: Outcomes[], totals: Outcomes[]): Split[] {
  return names.map((name, index) => {
    const { games, share, whiteScore } = numbersOf(
      counts[index] ?? [0, 0, 0],
      gamesOf(totals[index] ?? [0, 0, 0]),
    );
    return { name, games, share, ...(whiteScore !== undefined && { whiteScore }) };
  });
}

/** Makes of what was sent of a position what is said of it. */
export function detailOf(position: PositionDetail, index: DetailIndex): OpeningDetail {
  const games = position.bands.reduce((sum, outcomes) => sum + gamesOf(outcomes), 0);
  const shareOf = (some: number) => (games ? some / games : 0);
  const listed = position.moves.reduce((sum, [, played]) => sum + played, 0);
  const others = Math.max(0, games - listed);

  return {
    bands: splits(bandNames(index.bands), position.bands, index.totals.bands),
    speeds: splits(index.speeds.map(capitalised), position.speeds, index.totals.speeds),
    moves: position.moves.map(([san, played, to]) => ({
      san,
      games: played,
      share: shareOf(played),
      to,
    })),
    others: { games: others, share: shareOf(others) },
    ...(games > 0 && {
      meanMoves: Math.round(position.plies / games / 2),
      short: position.short / games,
    }),
  };
}

const isOutcomes = (all: unknown) =>
  Array.isArray(all) && all.every((one) => Array.isArray(one) && one.length === 3);

const isDetail = (position: PositionDetail | null | undefined): position is PositionDetail =>
  !!position &&
  isOutcomes(position.bands) &&
  isOutcomes(position.speeds) &&
  Array.isArray(position.moves) &&
  Number.isFinite(position.plies) &&
  Number.isFinite(position.short);

/**
 * The detail of any position, by its place: `load` fetches the files the detail is cut into,
 * each once and only when a position in it is asked for. A file that could not be had is asked
 * for again the next time.
 */
export function createDetails(
  index: DetailIndex,
  load: (chunk: number) => Promise<DetailChunk>,
): (place: number) => Promise<OpeningDetail> {
  const chunks = new Map<number, Promise<DetailChunk>>();

  return async (place) => {
    const number = Math.floor(place / index.size);
    let chunk = chunks.get(number);
    if (!chunk) {
      chunk = load(number);
      chunks.set(number, chunk);
      chunk.catch(() => chunks.delete(number));
    }
    const positions = await chunk;
    const position = Array.isArray(positions) ? positions[place - number * index.size] : undefined;
    if (!isDetail(position)) throw new Error(`the detail of position ${place} is unreadable`);
    return detailOf(position, index);
  };
}

const percent = (share: number) => `${(share * 100).toFixed(1)}%`;
const points = (difference: number) => (Math.abs(difference) * 100).toFixed(1);

/**
 * White's score in the games of an opening, set against what the players' ratings predicted,
 * and that against the same for all games — over which White does a little better than
 * predicted, so that an opening does well for White only above that, and well for Black below
 * it. A difference within two standard errors of the score is put down to chance. There is
 * nothing to say of fewer games than can carry a score.
 */
export function againstRatings(numbers: LineNumbers, total: LineNumbers): string | undefined {
  const score = scoreOf(numbers);
  const { games, expected, edge } = numbers;
  if (score === undefined || edge === undefined || total.edge === undefined) return undefined;

  const beyond = edge - total.edge;
  const chance = 1 / Math.sqrt(games);
  return (
    `The players’ ratings predicted ${percent(expected / games)} for White, who scored ` +
    `${percent(score)}: ${points(edge)} points ${edge < 0 ? 'less' : 'more'}. ` +
    `Over all games White does ${points(total.edge)} points ` +
    `${total.edge < 0 ? 'worse' : 'better'} than predicted, ` +
    (Math.abs(beyond) <= chance
      ? `and over ${games.toLocaleString('en')} games the difference could be chance.`
      : `so the opening is doing well for ${beyond > 0 ? 'White' : 'Black'}.`)
  );
}
