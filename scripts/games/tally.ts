import { eachGame, movesOf, pliesOf, type Tags } from './pgn.ts';
import { createGame } from './play.ts';

/** The speeds games are kept apart by, as lichess calls them. Ultrabullet counts as bullet. */
export const SPEEDS = ['bullet', 'blitz', 'rapid', 'classical'] as const;
export type Speed = (typeof SPEEDS)[number];

/**
 * The strengths games are kept apart by: a game is in the highest band whose number the mean of
 * its two players' ratings reaches. They are lichess's ratings, which are not FIDE's.
 */
export const BANDS = [0, 1200, 1600, 2000, 2400] as const;
export type Band = (typeof BANDS)[number];

/** Why a game is left out of the count. */
export const REASONS = [
  /** Played over days: another game than the one played at a sitting. */
  'correspondence',
  /** It has no result. */
  'unfinished',
  /** One of its players has no rating. */
  'unrated',
  /** A player left before it had begun, or not a move was made. */
  'abandoned',
  /** One of its players is a program. */
  'bot',
  /** It has a move no piece can make, or is of a speed there is no knowing. */
  'unreadable',
] as const;
export type Reason = (typeof REASONS)[number];

/** What is counted of the games of one speed and band that reached a position. */
export interface Counts {
  /** Games White won. */
  white: number;
  draws: number;
  /** Games Black won. */
  black: number;
  /**
   * What the players' ratings said White would score, added up: a point for a win and half for
   * a draw. Each game's is rounded to a hundredth, so that the sum is the same in any order.
   */
  expected: number;
  /** How long the games were, added up: the moves of both sides. */
  plies: number;
  /** Games that were over within twenty moves. */
  short: number;
}

/** What `Counts` holds, in the order it is kept and written in. */
export const MEASURES = ['white', 'draws', 'black', 'expected', 'plies', 'short'] as const;
const WHITE = MEASURES.indexOf('white');
const DRAWS = MEASURES.indexOf('draws');
const BLACK = MEASURES.indexOf('black');
const EXPECTED = MEASURES.indexOf('expected');
const PLIES = MEASURES.indexOf('plies');
const SHORT = MEASURES.indexOf('short');
/** The last half-move of a game that is over within twenty moves. */
const SHORT_GAME = 40;

/** How many numbers are kept for each position: a set of counts for each speed and band. */
const PER_POSITION = SPEEDS.length * BANDS.length * MEASURES.length;

/** What was counted of a body of games, for each of a list of positions. */
export interface Tally {
  /** How many games were read, counted or not. */
  games: number;
  /** How many of them were left out, by why. */
  leftOut: Record<Reason, number>;
  /**
   * The counts, position by position, speed by speed, band by band, in the order of `MEASURES`.
   * `expected` is kept in hundredths, which makes every number here whole. Read with `countsOf`.
   */
  counts: Float64Array;
  /** For each position, the moves that were played from it and in how many games each was. */
  moves: Map<string, number>[];
}

/** A tally of no games, for `positions` positions. */
export function createTally(positions: number): Tally {
  return {
    games: 0,
    leftOut: Object.fromEntries(REASONS.map((reason) => [reason, 0])) as Record<Reason, number>,
    counts: new Float64Array(positions * PER_POSITION),
    moves: Array.from({ length: positions }, () => new Map()),
  };
}

/** Where in `counts` the numbers for a position, a speed and a band begin. */
const offsetOf = (position: number, speed: number, band: number) =>
  ((position * SPEEDS.length + speed) * BANDS.length + band) * MEASURES.length;

/** What was counted for the `position`th position, of games of one speed and band. */
export function countsOf(tally: Tally, position: number, speed: Speed, band: Band): Counts {
  const offset = offsetOf(position, SPEEDS.indexOf(speed), BANDS.indexOf(band));
  const [white = 0, draws = 0, black = 0, expected = 0, plies = 0, short = 0] =
    tally.counts.subarray(offset, offset + MEASURES.length);
  return { white, draws, black, expected: expected / 100, plies, short };
}

/** Adds `counts` to what the tally has for a position, a speed and a band. */
export function addCounts(
  tally: Tally,
  position: number,
  speed: Speed,
  band: Band,
  counts: Counts,
): void {
  const offset = offsetOf(position, SPEEDS.indexOf(speed), BANDS.indexOf(band));
  for (const [index, measure] of MEASURES.entries()) {
    const value = index === EXPECTED ? Math.round(counts.expected * 100) : counts[measure];
    tally.counts[offset + index] = (tally.counts[offset + index] as number) + value;
  }
}

/** How many games were counted for the `position`th position, of every speed and band. */
export function gamesReaching(tally: Tally, position: number): number {
  let games = 0;
  for (
    let cell = position * PER_POSITION;
    cell < (position + 1) * PER_POSITION;
    cell += MEASURES.length
  ) {
    for (const outcome of [WHITE, DRAWS, BLACK]) games += tally.counts[cell + outcome] as number;
  }
  return games;
}

/** How many of the games read were counted. */
export function countedGames(tally: Tally): number {
  return tally.games - Object.values(tally.leftOut).reduce((sum, games) => sum + games, 0);
}

/**
 * The moves played from the `position`th position with the number of games each was played in:
 * the most played first, and of moves played as often, the first in the alphabet.
 */
export function movesFrom(tally: Tally, position: number): [san: string, games: number][] {
  return [...(tally.moves[position] ?? [])].sort(
    ([a, timesA], [b, timesB]) => timesB - timesA || (a < b ? -1 : 1),
  );
}

/** Adds what `from` counted to `into`. Both must be tallies for the same positions. */
export function mergeTallies(into: Tally, from: Tally): void {
  if (into.counts.length !== from.counts.length) {
    throw new Error('tallies of different positions cannot be added up');
  }
  into.games += from.games;
  for (const reason of REASONS) into.leftOut[reason] += from.leftOut[reason];
  for (let index = 0; index < from.counts.length; index++) {
    into.counts[index] = (into.counts[index] as number) + (from.counts[index] as number);
  }
  for (const [position, moves] of from.moves.entries()) {
    const sum = into.moves[position] as Map<string, number>;
    for (const [san, games] of moves) sum.set(san, (sum.get(san) ?? 0) + games);
  }
}

/**
 * The speed a game was played at, as its `Event` names it: `Rated Blitz game`, or for a game of
 * a Swiss tournament, `Blitz swiss` and where the tournament is.
 */
const SPEED_OF: Partial<Record<string, number>> = {
  UltraBullet: SPEEDS.indexOf('bullet'),
  Bullet: SPEEDS.indexOf('bullet'),
  Blitz: SPEEDS.indexOf('blitz'),
  Rapid: SPEEDS.indexOf('rapid'),
  Classical: SPEEDS.indexOf('classical'),
};

/** Which of `white`, `draws` and `black` a game with this `Result` adds to. */
const OUTCOME_OF: Partial<Record<string, number>> = {
  '1-0': WHITE,
  '1/2-1/2': DRAWS,
  '0-1': BLACK,
};

/** Counts games, a piece of PGN at a time, into a tally of its own. */
export interface Counter {
  /** Counts the games in `pgn`, which must be whole games. */
  count(pgn: string): void;
  readonly tally: Tally;
}

/**
 * Counts games for the `positions` they pass through in their first `depth` moves (counting each
 * side's), however they come to them: a game counts once for each, with the move it then made.
 */
export function createCounter(positions: readonly string[], depth: number): Counter {
  const tally = createTally(positions.length);
  const indexOf = new Map(positions.map((position, index) => [position, index]));
  const game = createGame();
  const start = indexOf.get(game.position());

  // What the game being read has reached: which positions, and the move made from each.
  const reached: number[] = [];
  const thenPlayed: (string | undefined)[] = [];
  /** The last game to reach each position, by its number among the games read. */
  const lastReachedBy = new Uint32Array(positions.length);

  /** Reads one game, and says why if it is to be left out. */
  function read(tags: Tags, moveText: string): Reason | undefined {
    const [first, second] = tags.Event?.split(' ', 2) ?? [];
    const event = (first === 'Rated' ? second : first) ?? '';
    if (event === 'Correspondence') return 'correspondence';
    if (tags.Termination === 'Abandoned') return 'abandoned';
    const outcome = OUTCOME_OF[tags.Result ?? ''];
    if (outcome === undefined) return 'unfinished';
    const white = Number(tags.WhiteElo);
    const black = Number(tags.BlackElo);
    if (!(white > 0 && black > 0)) return 'unrated';
    if (tags.WhiteTitle === 'BOT' || tags.BlackTitle === 'BOT') return 'bot';
    // One move more than is played: the move made from a position reached by the last of them.
    const moves = movesOf(moveText, depth + 1);
    if (moves.length === 0) return 'abandoned';
    const speed = SPEED_OF[event];
    if (speed === undefined) return 'unreadable';

    reached.length = 0;
    thenPlayed.length = 0;
    game.restart();
    for (let ply = 0, position = start; ; ply++) {
      if (position !== undefined && lastReachedBy[position] !== tally.games) {
        lastReachedBy[position] = tally.games;
        reached.push(position);
        thenPlayed.push(moves[ply]);
      }
      if (ply === depth || ply === moves.length) break;
      try {
        game.play(moves[ply] as string);
      } catch {
        return 'unreadable';
      }
      position = indexOf.get(game.position());
    }

    const mean = (white + black) >> 1;
    const band = BANDS.findLastIndex((floor) => mean >= floor);
    const expected = Math.round(100 / (1 + 10 ** ((black - white) / 400)));
    const plies = pliesOf(moveText);
    for (const [index, position] of reached.entries()) {
      const offset = offsetOf(position, speed, band);
      tally.counts[offset + outcome] = (tally.counts[offset + outcome] as number) + 1;
      tally.counts[offset + EXPECTED] = (tally.counts[offset + EXPECTED] as number) + expected;
      tally.counts[offset + PLIES] = (tally.counts[offset + PLIES] as number) + plies;
      if (plies <= SHORT_GAME) {
        tally.counts[offset + SHORT] = (tally.counts[offset + SHORT] as number) + 1;
      }
      const move = thenPlayed[index];
      if (move !== undefined) {
        const played = tally.moves[position] as Map<string, number>;
        played.set(move, (played.get(move) ?? 0) + 1);
      }
    }
    return undefined;
  }

  return {
    tally,
    count(pgn) {
      eachGame(pgn, (tags, moveText) => {
        tally.games++;
        const reason = read(tags, moveText);
        if (reason) tally.leftOut[reason]++;
      });
    },
  };
}
