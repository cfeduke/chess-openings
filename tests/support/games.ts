import { createGame } from '../../scripts/games/play.ts';
import { createCounter, type Tally } from '../../scripts/games/tally.ts';
import { createReplayer } from '../../scripts/openings/replay.ts';

const replay = createReplayer();

/** The position every game begins in, as games are counted for it. */
export const START = createGame().position();

/** The position the moves of `pgn` lead to (`1. e4 c5`), as the rules engine has it. */
export const positionReachedBy = (pgn: string): string =>
  replay('a line', pgn).positions.at(-1) as string;

/** What is said of a game besides its moves; what is not said is the same for every game. */
export interface GameOptions {
  /** `Rated Blitz game` unless it says otherwise. */
  event?: string;
  /** The players' ratings: 1500 each unless they say otherwise. */
  white?: number | '?';
  black?: number | '?';
  /** `1-0` unless it says otherwise. */
  result?: string;
  /** Any other tags, or other values for these. */
  tags?: Record<string, string>;
}

/** A game as lichess writes one in its database, with `moves` as its move text. */
export function lichessGame(moves: string, options: GameOptions = {}): string {
  const { event = 'Rated Blitz game', white = 1500, black = 1500, result = '1-0' } = options;
  const tags = {
    Event: event,
    Result: result,
    WhiteElo: String(white),
    BlackElo: String(black),
    Termination: 'Normal',
    ...options.tags,
  };
  const lines = Object.entries(tags).map(([name, value]) => `[${name} "${value}"]`);
  return `${lines.join('\n')}\n\n${moves} ${result}\n\n`;
}

/** What a counter makes of the games in `pgn`, read as deep as `depth` for `positions`. */
export function countGames(pgn: string, positions: readonly string[], depth: number): Tally {
  const counter = createCounter(positions, depth);
  counter.count(pgn);
  return counter.tally;
}
