import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  countGames,
  lichessGame as game,
  positionReachedBy,
  START,
} from '../../tests/support/games.ts';
import { DATA_DIR } from '../openings/dataset.ts';
import { SOURCE_FILE } from '../openings/source.ts';
import { BANDS, countsOf, gamesReaching, movesFrom, SPEEDS } from './tally.ts';
import {
  formatTallies,
  GAMES_DIR,
  type GameTallies,
  POSITIONS_FILE,
  readGameTallies,
  TALLIES_FILE,
  type VendoredGames,
} from './vendored.ts';

const POSITIONS = [
  START,
  positionReachedBy('1. e4'),
  positionReachedBy('1. e4 c5'),
  positionReachedBy('1. b4'),
];

const exampleTally = () =>
  countGames(
    [
      game('1. e4 c5 2. Nf3', { white: 1700, black: 1300 }),
      game('1. e4 e5', { result: '1/2-1/2' }),
      game('1. d4', { result: '0-1', event: 'Rated Bullet game', white: 2450, black: 2450 }),
      game('1. e4', { result: '*' }),
    ].join(''),
    POSITIONS,
    40,
  );

const SOURCE: VendoredGames = {
  database: 'lichess_db_standard_rated',
  month: '2026-10',
  url: 'https://database.lichess.org/standard/lichess_db_standard_rated_2026-10.pgn.zst',
  license: 'CC0-1.0',
  retrieved: '2026-11-13',
  games: 4,
  counted: 3,
  leftOut: {
    correspondence: 0,
    unfinished: 1,
    unrated: 0,
    abandoned: 0,
    bot: 0,
    unreadable: 0,
  },
  depth: 40,
};

/** A directory holding `tally` as it is vendored. */
function vendored(files = formatTallies(POSITIONS, exampleTally()), source: object = SOURCE) {
  const dir = mkdtempSync(join(tmpdir(), 'lichess-games-'));
  writeFileSync(join(dir, POSITIONS_FILE), files.positions);
  writeFileSync(join(dir, TALLIES_FILE), files.tallies);
  writeFileSync(join(dir, SOURCE_FILE), JSON.stringify(source));
  return dir;
}

describe('formatTallies', () => {
  it('lists every position of interest, reached or not, with the moves played from it', () => {
    expect(formatTallies(POSITIONS, exampleTally()).positions).toBe(
      [
        'id\tposition\tmoves',
        `0\t${START}\te4:2 d4:1`,
        `1\t${POSITIONS[1]}\tc5:1 e5:1`,
        `2\t${POSITIONS[2]}\tNf3:1`,
        `3\t${POSITIONS[3]}\t`,
        '',
      ].join('\n'),
    );
  });

  it('has a row for each speed and band in which a position was reached', () => {
    expect(formatTallies(POSITIONS, exampleTally()).tallies).toBe(
      [
        'id\tspeed\tband\twhite\tdraws\tblack\texpected\tplies\tshort',
        '0\tbullet\t2400\t0\t0\t1\t0.50\t1\t1',
        '0\tblitz\t1200\t1\t1\t0\t1.41\t5\t2',
        '1\tblitz\t1200\t1\t1\t0\t1.41\t5\t2',
        '2\tblitz\t1200\t1\t0\t0\t0.91\t3\t1',
        '',
      ].join('\n'),
    );
  });

  it('lists no more than the ten moves most played from a position', () => {
    const firstMoves = ['a3', 'a4', 'b3', 'b4', 'c3', 'c4', 'd3', 'd4', 'e3', 'e4', 'f3', 'f4'];
    const games = firstMoves.flatMap((move, index) => Array(index + 1).fill(game(`1. ${move}`)));
    const tally = countGames(games.join(''), POSITIONS, 40);

    const [, start] = formatTallies(POSITIONS, tally).positions.split('\n');

    expect(start?.split('\t')[2]).toBe('f4:12 f3:11 e4:10 e3:9 d4:8 d3:7 c4:6 c3:5 b4:4 b3:3');
  });
});

describe('readGameTallies', () => {
  it('reads back what was written', () => {
    const tally = exampleTally();

    const read = readGameTallies(vendored());

    expect(read.positions).toEqual(POSITIONS);
    expect(read.tally).toEqual(tally);
    expect(read.source).toEqual(SOURCE);
  });

  it('refuses tallies that do not say where they are from', () => {
    const { month: _, ...unnamed } = SOURCE;

    expect(() => readGameTallies(vendored(undefined, unnamed))).toThrow(/month/);
  });

  it.each([
    ['a row that is cut short', '0\tblitz\t1200\t1\t1'],
    ['a speed there is not', '0\thyperbullet\t1200\t1\t1\t0\t1.41\t5\t2'],
    ['a band there is not', '0\tblitz\t1300\t1\t1\t0\t1.41\t5\t2'],
    ['a position there is not', '9\tblitz\t1200\t1\t1\t0\t1.41\t5\t2'],
    ['a count that is not a number', '0\tblitz\t1200\tmany\t1\t0\t1.41\t5\t2'],
  ])('refuses %s, and says where it is', (_what, row) => {
    const files = formatTallies(POSITIONS, exampleTally());
    const tallies = `${files.tallies}${row}\n`;

    expect(() => readGameTallies(vendored({ ...files, tallies }))).toThrow(/tallies\.tsv:6/);
  });

  it('refuses a list of positions whose numbers are out of order', () => {
    const files = formatTallies(POSITIONS, exampleTally());
    const positions = files.positions.replace('\n1\t', '\n7\t');

    expect(() => readGameTallies(vendored({ ...files, positions }))).toThrow(/positions\.tsv:3/);
  });
});

describe('the vendored tallies', () => {
  let read: GameTallies;
  beforeAll(() => {
    read = readGameTallies(join(DATA_DIR, GAMES_DIR));
  });

  const cells = SPEEDS.flatMap((speed) => BANDS.map((band) => ({ speed, band })));
  const gamesIn = (position: number, { speed, band }: (typeof cells)[number]) => {
    const { white, draws, black } = countsOf(read.tally, position, speed, band);
    return white + draws + black;
  };

  it('say which month of which database they are of, and on what terms', () => {
    const { source } = read;

    expect(source.database).toBe('lichess_db_standard_rated');
    expect(source.month).toMatch(/^20\d\d-(0[1-9]|1[0-2])$/);
    expect(source.url).toBe(
      `https://database.lichess.org/standard/lichess_db_standard_rated_${source.month}.pgn.zst`,
    );
    expect(source.license).toBe('CC0-1.0');
  });

  it('account for every game that was read: counted, or left out and why', () => {
    const { source, tally } = read;
    const leftOut = Object.values(source.leftOut).reduce((sum, games) => sum + games);

    expect(source.counted + leftOut).toBe(source.games);
    expect(source.counted).toBeGreaterThan(0);
    // Every game that is counted counts for the position it began in.
    expect(gamesReaching(tally, 0)).toBe(source.counted);
  });

  it('begin with the position every game begins in, each position there once', () => {
    expect(read.positions[0]).toBe(START);
    expect(new Set(read.positions).size).toBe(read.positions.length);
  });

  it('never count more games for a position than were played', () => {
    const over = read.positions.filter((_, position) =>
      cells.some((cell) => gamesIn(position, cell) > gamesIn(0, cell)),
    );

    expect(over).toEqual([]);
  });

  it('never count more moves from a position than games that reached it', () => {
    const { positions, tally } = read;
    const over = positions.filter(
      (_, position) =>
        movesFrom(tally, position).reduce((sum, [, games]) => sum + games, 0) >
        gamesReaching(tally, position),
    );

    expect(over).toEqual([]);
  });

  it('expect of White, in each speed and band, a score a game could have', () => {
    const impossible = read.positions.filter((_, position) =>
      cells.some((cell) => {
        const { expected } = countsOf(read.tally, position, cell.speed, cell.band);
        return expected < 0 || expected > gamesIn(position, cell);
      }),
    );

    expect(impossible).toEqual([]);
  });
});
