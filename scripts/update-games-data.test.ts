import { zstdCompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { createGame } from './games/play.ts';
import { createCounter } from './games/tally.ts';
import { formatTallies } from './games/vendored.ts';
import { createReplayer } from './openings/replay.ts';
import { updateGamesData } from './update-games-data.ts';

const replay = createReplayer();
const positionAfter = (pgn: string) => replay('a line', pgn).positions.at(-1) as string;

const INTEREST = {
  positions: [
    createGame().position(),
    positionAfter('1. e4'),
    positionAfter('1. e4 c5'),
    positionAfter('1. b4 e5'),
  ],
  depth: 8,
};

const game = (moves: string, result = '1-0', event = 'Blitz') =>
  `[Event "Rated ${event} game"]\n[Result "${result}"]\n[WhiteElo "1500"]\n[BlackElo "1700"]\n\n${moves} ${result}\n\n`;

const PGN = [
  game('1. e4 c5 2. Nf3'),
  game('1. e4 e5', '0-1'),
  game('1. d4 d5', '1/2-1/2', 'Rapid'),
  game('1. e4 c5 2. Nc3', '1-0', 'Correspondence'),
  game('1. e4', '*'),
  game('1. e4 c6', '0-1', 'Bullet'),
].join('');

/** The games as lichess publishes them: zstd, in frames that end wherever they end. */
const FILE = Buffer.concat(
  [PGN.slice(0, 300), PGN.slice(300, 500), PGN.slice(500)].map((part) =>
    zstdCompressSync(Buffer.from(part)),
  ),
);

/** Where a download that gets half of the file stops. */
const HALF = Math.floor(FILE.length / 2);

const urlOf = (month: string) =>
  `https://database.lichess.org/standard/lichess_db_standard_rated_${month}.pgn.zst`;

/** What `open` is to do the `n`th time it is asked: how many bytes to give, and how to end. */
interface Opening {
  bytes?: number;
  ends?: 'well' | 'badly';
}

function fakeDatabase(openings: Opening[] = []) {
  const opened: [location: string, from: number][] = [];
  const written = new Map<string, string>();
  const paused: number[] = [];
  const said: string[] = [];
  return {
    opened,
    written,
    paused,
    said,
    io: {
      fetchText: async (url: string) => {
        if (url !== 'https://database.lichess.org/standard/list.txt') throw new Error(url);
        return `${urlOf('2026-10')}\n${urlOf('2026-09')}\n${urlOf('2026-08')}\n`;
      },
      open: async (location: string, from: number) => {
        const { bytes = FILE.length, ends = 'well' } = openings[opened.length] ?? {};
        opened.push([location, from]);
        return {
          size: FILE.length,
          bytes: (async function* () {
            for (let at = from; at < Math.min(from + bytes, FILE.length); at += 64) {
              yield FILE.subarray(at, Math.min(at + 64, from + bytes, FILE.length));
            }
            if (ends === 'badly') throw new Error('the connection was lost');
          })(),
        };
      },
      writeFile: async (path: string, contents: string) => {
        written.set(path, contents);
      },
      today: () => '2026-11-13',
      pause: async (ms: number) => {
        paused.push(ms);
      },
      log: (line: string) => {
        said.push(line);
      },
      workers: 2,
    },
  };
}

/** What counting `PGN` in one go leaves to be written. */
function expected() {
  const counter = createCounter(INTEREST.positions, INTEREST.depth);
  counter.count(PGN);
  return { tally: counter.tally, files: formatTallies(INTEREST.positions, counter.tally) };
}

describe('updateGamesData', () => {
  it('reads the month it is asked for from the database, and writes its tallies', async () => {
    const database = fakeDatabase();

    await updateGamesData('2026-09', INTEREST, 'data/lichess-games', database.io);

    expect(database.opened).toEqual([[urlOf('2026-09'), 0]]);
    expect(database.written.get('data/lichess-games/positions.tsv')).toBe(
      expected().files.positions,
    );
    expect(database.written.get('data/lichess-games/tallies.tsv')).toBe(expected().files.tallies);
  });

  it('records which month that was, how many games it held and which were left out', async () => {
    const database = fakeDatabase();

    await updateGamesData('2026-09', INTEREST, 'data/lichess-games', database.io);

    expect(JSON.parse(database.written.get('data/lichess-games/SOURCE.json') ?? '')).toEqual({
      database: 'lichess_db_standard_rated',
      month: '2026-09',
      url: urlOf('2026-09'),
      license: 'CC0-1.0',
      retrieved: '2026-11-13',
      games: 6,
      counted: 4,
      leftOut: {
        correspondence: 1,
        unfinished: 1,
        unrated: 0,
        abandoned: 0,
        bot: 0,
        unreadable: 0,
      },
      depth: 8,
    });
  });

  it('reads the newest month there is when it is not asked for one', async () => {
    const database = fakeDatabase();

    const report = await updateGamesData(undefined, INTEREST, 'data/lichess-games', database.io);

    expect(database.opened).toEqual([[urlOf('2026-10'), 0]]);
    expect(report.month).toBe('2026-10');
  });

  it('reads a file that has been downloaded already, and knows its month by its name', async () => {
    const database = fakeDatabase();
    const path = '/downloads/lichess_db_standard_rated_2024-03.pgn.zst';

    await updateGamesData(path, INTEREST, 'data/lichess-games', database.io);

    expect(database.opened).toEqual([[path, 0]]);
    expect(JSON.parse(database.written.get('data/lichess-games/SOURCE.json') ?? '')).toMatchObject({
      month: '2024-03',
      url: urlOf('2024-03'),
    });
  });

  it('refuses a file whose name does not say which month it is of', async () => {
    const database = fakeDatabase();

    await expect(
      updateGamesData('/downloads/games.pgn.zst', INTEREST, 'data/lichess-games', database.io),
    ).rejects.toThrow(/which month/);
    expect(database.opened).toEqual([]);
  });

  it('says what it did: the games it read and counted, and the positions none of them reached', async () => {
    const database = fakeDatabase();

    const report = await updateGamesData('2026-09', INTEREST, 'data/lichess-games', database.io);

    expect(report).toEqual({
      month: '2026-09',
      games: 6,
      counted: 4,
      leftOut: {
        correspondence: 1,
        unfinished: 1,
        unrated: 0,
        abandoned: 0,
        bot: 0,
        unreadable: 0,
      },
      unreached: [positionAfter('1. b4 e5')],
    });
  });

  it.each([
    ['breaks off', 'badly'],
    ['stops short', 'well'],
  ] as const)('takes up a download that %s where it left off', async (_how, ends) => {
    const database = fakeDatabase([{ bytes: HALF, ends }, { bytes: 1, ends }, {}]);

    await updateGamesData('2026-09', INTEREST, 'data/lichess-games', database.io);

    expect(database.opened).toEqual([
      [urlOf('2026-09'), 0],
      [urlOf('2026-09'), HALF],
      [urlOf('2026-09'), HALF + 1],
    ]);
    expect(database.paused.length).toBe(2);
    expect(database.written.get('data/lichess-games/tallies.tsv')).toBe(expected().files.tallies);
  });

  it('gives up on a download that keeps breaking off without getting any further', async () => {
    const database = fakeDatabase([
      { bytes: HALF, ends: 'badly' },
      ...Array<Opening>(20).fill({ bytes: 0, ends: 'badly' }),
    ]);

    await expect(
      updateGamesData('2026-09', INTEREST, 'data/lichess-games', database.io),
    ).rejects.toThrow(/connection was lost/);
    expect(database.opened.length).toBe(6);
    expect(database.written.size).toBe(0);
  });
});
