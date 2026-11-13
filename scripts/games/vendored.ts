import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTsv } from '../openings/parse-tsv.ts';
import { readSourceFile, SOURCE_FILE } from '../openings/source.ts';
import {
  addCounts,
  BANDS,
  type Band,
  countsOf,
  createTally,
  movesFrom,
  REASONS,
  type Reason,
  SPEEDS,
  type Speed,
  type Tally,
} from './tally.ts';

/** Where the tallies of lichess's games are kept within the data directory. */
export const GAMES_DIR = 'lichess-games';

/** The positions games were counted for, one to a row, with the moves played from each. */
export const POSITIONS_FILE = 'positions.tsv';
const POSITION_COLUMNS = ['id', 'position', 'moves'];

/** What was counted: a row for each position, speed and band that any game was counted in. */
export const TALLIES_FILE = 'tallies.tsv';
const TALLY_COLUMNS = [
  'id',
  'speed',
  'band',
  'white',
  'draws',
  'black',
  'expected',
  'plies',
  'short',
];

/** How many of the moves played from a position are listed: the most played. */
const MOVES_LISTED = 10;

/** What the source file holds: which games were counted, and how many. */
export interface VendoredGames {
  /** Which of lichess's databases the games are from. */
  database: string;
  /** The month they were played in, `YYYY-MM`. */
  month: string;
  /** Where that month is published. */
  url: string;
  license: string;
  /** The day the games were read, `YYYY-MM-DD`. */
  retrieved: string;
  /** How many games the month held. */
  games: number;
  /** How many of them were counted. */
  counted: number;
  /** How many were not, by why. */
  leftOut: Record<Reason, number>;
  /** How many moves into each game, counting each side's, positions were looked for. */
  depth: number;
}

/** The tallies of lichess's games, as vendored. */
export interface GameTallies {
  source: VendoredGames;
  /** The positions games were counted for; a position's place here is its place in `tally`. */
  positions: string[];
  /** What was counted, with only the most played of the moves from each position. */
  tally: Tally;
}

/** What `POSITIONS_FILE` and `TALLIES_FILE` are to hold for a tally of `positions`. */
export function formatTallies(
  positions: readonly string[],
  tally: Tally,
): { positions: string; tallies: string } {
  const positionRows = positions.map((position, id) => {
    const moves = movesFrom(tally, id).slice(0, MOVES_LISTED);
    return [id, position, moves.map(([san, games]) => `${san}:${games}`).join(' ')];
  });

  const tallyRows = positions.flatMap((_, id) =>
    SPEEDS.flatMap((speed) =>
      BANDS.flatMap((band) => {
        const { white, draws, black, expected, plies, short } = countsOf(tally, id, speed, band);
        if (white + draws + black === 0) return [];
        return [[id, speed, band, white, draws, black, expected.toFixed(2), plies, short]];
      }),
    ),
  );

  const table = (columns: string[], rows: (string | number)[][]) =>
    `${[columns, ...rows].map((row) => row.join('\t')).join('\n')}\n`;
  return {
    positions: table(POSITION_COLUMNS, positionRows),
    tallies: table(TALLY_COLUMNS, tallyRows),
  };
}

const isCount = (text: string) => /^\d+$/.test(text);

function readSource(gamesDir: string): VendoredGames {
  const source = readSourceFile(gamesDir, [
    'database',
    'month',
    'url',
    'license',
    'retrieved',
  ]) as unknown as VendoredGames;
  const numbers = [source.games, source.counted, source.depth];
  if (!numbers.every(Number.isInteger) || !REASONS.every((reason) => reason in source.leftOut)) {
    throw new Error(`${GAMES_DIR}/${SOURCE_FILE}: does not say how many games were counted`);
  }
  return source;
}

/** Reads the tallies vendored in `gamesDir`. Errors name the file and the 1-based line. */
export function readGameTallies(gamesDir: string): GameTallies {
  const source = readSource(gamesDir);
  const read = (file: string) => readFileSync(join(gamesDir, file), 'utf8');

  const positionRows = parseTsv(read(POSITIONS_FILE), POSITIONS_FILE, POSITION_COLUMNS);
  const tally = createTally(positionRows.length);
  tally.games = source.games;
  tally.leftOut = { ...source.leftOut };

  const positions = positionRows.map(({ cells: [id, position = '', moves = ''], fail }, index) => {
    if (id !== String(index)) fail(`expected id ${index}, the row's place in the file`);
    if (!position) fail('empty position');
    for (const move of moves ? moves.split(' ') : []) {
      const [san = '', games = ''] = move.split(':');
      if (!san || !isCount(games)) fail(`invalid move ${JSON.stringify(move)}`);
      tally.moves[index]?.set(san, Number(games));
    }
    return position;
  });

  for (const { cells, fail } of parseTsv(read(TALLIES_FILE), TALLIES_FILE, TALLY_COLUMNS)) {
    const [id = '', speed, band, white = '', draws = '', black = '', expected = '', ...rest] =
      cells;
    const [plies = '', short = ''] = rest;
    if (!isCount(id) || Number(id) >= positions.length) fail(`no position ${JSON.stringify(id)}`);
    if (!SPEEDS.includes(speed as Speed)) fail(`no speed ${JSON.stringify(speed)}`);
    if (!BANDS.includes(Number(band) as Band)) fail(`no band ${JSON.stringify(band)}`);
    if (![white, draws, black, plies, short].every(isCount) || !/^\d+\.\d\d$/.test(expected)) {
      fail('a count that is not a number');
    }
    addCounts(tally, Number(id), speed as Speed, Number(band) as Band, {
      white: Number(white),
      draws: Number(draws),
      black: Number(black),
      expected: Number(expected),
      plies: Number(plies),
      short: Number(short),
    });
  }

  return { source, positions, tally };
}
