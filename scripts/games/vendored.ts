import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { formatTsv, parseTsv } from '../openings/parse-tsv.ts';
import { readSourceFile, SOURCE_FILE } from '../openings/source.ts';
import {
  addCounts,
  BANDS,
  type Band,
  countsOf,
  createTally,
  MEASURES,
  movesFrom,
  REASONS,
  type Reason,
  SPEEDS,
  type Speed,
  type Tally,
} from './tally.ts';

/** Where the tallies of lichess's games are kept within the data directory. */
export const GAMES_DIR = 'lichess-games';

/**
 * The positions games were counted for, one to a row, with the moves played from each. The first
 * is the one every game begins in, which every game that is counted counts for: its tallies are
 * the totals, and what any other position's are a share of.
 */
export const POSITIONS_FILE = 'positions.tsv';
const POSITION_COLUMNS = ['id', 'position', 'moves'];

/** What was counted: a row for each position, speed and band that any game was counted in. */
export const TALLIES_FILE = 'tallies.tsv';
const TALLY_COLUMNS = ['id', 'speed', 'band', ...MEASURES];

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
  /**
   * The positions games were counted for, the one every game begins in first; a position's
   * place here is its place in `tally`.
   */
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
        const counts = countsOf(tally, id, speed, band);
        if (counts.white + counts.draws + counts.black === 0) return [];
        const cells = MEASURES.map((measure) =>
          measure === 'expected' ? counts.expected.toFixed(2) : counts[measure],
        );
        return [[id, speed, band, ...cells]];
      }),
    ),
  );

  return {
    positions: formatTsv(POSITION_COLUMNS, positionRows),
    tallies: formatTsv(TALLY_COLUMNS, tallyRows),
  };
}

const isCount = (text: string) => /^\d+$/.test(text);
const isHundredths = (text: string) => /^\d+\.\d\d$/.test(text);

function readSource(gamesDir: string): VendoredGames {
  const { games, counted, depth, leftOut, ...said } = readSourceFile(gamesDir, [
    'database',
    'month',
    'url',
    'license',
    'retrieved',
  ]);
  const reasons =
    leftOut && typeof leftOut === 'object' ? (leftOut as Record<string, unknown>) : {};
  const numbers = [games, counted, depth, ...REASONS.map((reason) => reasons[reason])];
  if (!numbers.every(Number.isInteger)) {
    throw new Error(
      `${basename(gamesDir)}/${SOURCE_FILE}: does not say how many games were counted`,
    );
  }
  return { ...said, games, counted, depth, leftOut } as VendoredGames;
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
    const [id = '', speed, band, ...numbers] = cells;
    if (!isCount(id) || Number(id) >= positions.length) fail(`no position ${JSON.stringify(id)}`);
    if (!SPEEDS.includes(speed as Speed)) fail(`no speed ${JSON.stringify(speed)}`);
    if (!BANDS.includes(Number(band) as Band)) fail(`no band ${JSON.stringify(band)}`);
    const counts = MEASURES.map((measure, index) => {
      const number = numbers[index] ?? '';
      if (!(measure === 'expected' ? isHundredths : isCount)(number)) {
        fail(`invalid ${measure} ${JSON.stringify(number)}`);
      }
      return [measure, Number(number)];
    });
    addCounts(tally, Number(id), speed as Speed, Number(band) as Band, Object.fromEntries(counts));
  }

  return { source, positions, tally };
}
