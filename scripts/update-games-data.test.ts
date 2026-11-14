import { zstdCompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  countGames,
  lichessGame as game,
  positionReachedBy,
  START,
} from '../tests/support/games.ts';
import { formatTallies } from './games/vendored.ts';
import { updateGamesData } from './update-games-data.ts';

const INTEREST = {
  positions: [
    START,
    positionReachedBy('1. e4'),
    positionReachedBy('1. e4 c5'),
    positionReachedBy('1. b4 e5'),
  ],
  depth: 8,
};

const PGN = [
  game('1. e4 c5 2. Nf3'),
  game('1. e4 e5', { result: '0-1' }),
  game('1. d4 d5', { result: '1/2-1/2', event: 'Rated Rapid game' }),
  game('1. e4 c5 2. Nc3', { event: 'Rated Correspondence game' }),
  game('1. e4', { result: '*' }),
  game('1. e4 c6', { result: '0-1', event: 'Rated Bullet game' }),
].join('');

/** The games as lichess publishes them: zstd, in frames that end wherever they end. */
const FILE = Buffer.concat(
  [PGN.slice(0, 300), PGN.slice(300, 500), PGN.slice(500)].map((part) =>
    zstdCompressSync(Buffer.from(part)),
  ),
);

const urlOf = (month: string) =>
  `https://database.lichess.org/standard/lichess_db_standard_rated_${month}.pgn.zst`;

/** Small enough parts that the file is a good many of them: three asked for at a time, five held. */
const SETTINGS = { threads: 2, connections: 3, partsHeld: 5, partSize: 32 };

/** The parts of the file, as the bytes each begins and ends at. */
const PARTS = Array.from({ length: Math.ceil(FILE.length / SETTINGS.partSize) }, (_, part) => [
  part * SETTINGS.partSize,
  Math.min((part + 1) * SETTINGS.partSize, FILE.length),
]);

/** What goes wrong with the part of the file beginning at `from`, the `nth` time it is asked for. */
type Mishap = (from: number, nth: number) => 'fails' | 'comes short' | undefined;

function fakeDatabase(
  mishap: Mishap = () => undefined,
  /** Waited for before the part of the file beginning at `from` comes. */
  delay: (from: number) => Promise<unknown> = async () => {},
) {
  const read: [location: string, from: number, to: number][] = [];
  const written = new Map<string, string>();
  const paused: number[] = [];
  const said: string[] = [];
  const flights = { now: 0, most: 0 };
  let clock = 0;
  return {
    read,
    written,
    paused,
    said,
    flights,
    io: {
      fetchText: async (url: string) => {
        if (url !== 'https://database.lichess.org/standard/list.txt') throw new Error(url);
        return `${urlOf('2026-10')}\n${urlOf('2026-09')}\n${urlOf('2026-08')}\n`;
      },
      size: async () => FILE.length,
      read: async (location: string, from: number, to: number) => {
        const nth = read.filter(([, asked]) => asked === from).length;
        read.push([location, from, to]);
        flights.most = Math.max(flights.most, ++flights.now);
        // Long enough for the parts asked for at one time to be on their way together.
        await new Promise((resolve) => setTimeout(resolve, 2));
        flights.now--;

        await delay(from);
        const wrong = mishap(from, nth);
        if (wrong === 'fails') throw new Error('the connection was lost');
        return FILE.subarray(from, wrong === 'comes short' ? to - 1 : to);
      },
      writeFile: async (path: string, contents: string) => {
        written.set(path, contents);
      },
      today: () => '2026-11-13',
      pause: async (ms: number) => {
        paused.push(ms);
      },
      // Each look at the clock finds it a minute later.
      now: () => {
        clock += 60_000;
        return clock;
      },
      log: (line: string) => {
        said.push(line);
      },
    },
  };
}

/** What counting `PGN` in one go leaves to be written. */
const expected = () =>
  formatTallies(INTEREST.positions, countGames(PGN, INTEREST.positions, INTEREST.depth));

describe('updateGamesData', () => {
  const update = (target: string | undefined, database: ReturnType<typeof fakeDatabase>) =>
    updateGamesData(target, INTEREST, 'data/lichess-games', database.io, SETTINGS);

  it('reads the month it is asked for from the database, and writes its tallies', async () => {
    const database = fakeDatabase();

    await update('2026-09', database);

    expect(new Set(database.read.map(([location]) => location))).toEqual(
      new Set([urlOf('2026-09')]),
    );
    expect(database.written.get('data/lichess-games/positions.tsv')).toBe(expected().positions);
    expect(database.written.get('data/lichess-games/tallies.tsv')).toBe(expected().tallies);
  });

  it('asks for the file a part at a time, in order, and for no more at once than it may', async () => {
    const database = fakeDatabase();

    await update('2026-09', database);

    expect(PARTS.length).toBeGreaterThan(SETTINGS.connections);
    expect(database.read.map(([, from, to]) => [from, to])).toEqual(PARTS);
    expect(database.flights.most).toBe(SETTINGS.connections);
  });

  it('goes on asking for parts while one is slow to come, but holds only so many', async () => {
    const tick = () => new Promise((resolve) => setTimeout(resolve, 20));
    let askedFor = 0;
    const database = fakeDatabase(undefined, async (from) => {
      if (from > 0) return;
      // The first part does not come until nothing more has been asked for in a while.
      for (let before = -1; before !== database.read.length; await tick()) {
        before = database.read.length;
      }
      askedFor = database.read.length;
    });

    await update('2026-09', database);

    expect(PARTS.length).toBeGreaterThan(SETTINGS.partsHeld);
    expect(askedFor).toBe(SETTINGS.partsHeld);
    expect(database.flights.most).toBe(SETTINGS.connections);
    expect(database.read.map(([, from, to]) => [from, to])).toEqual(PARTS);
    expect(database.written.get('data/lichess-games/tallies.tsv')).toBe(expected().tallies);
  });

  it('records which month that was, how many games it held and which were left out', async () => {
    const database = fakeDatabase();

    await update('2026-09', database);

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

    const report = await update(undefined, database);

    expect(database.read[0]?.[0]).toBe(urlOf('2026-10'));
    expect(report.source.month).toBe('2026-10');
  });

  it('reads a file that has been downloaded already, and knows its month by its name', async () => {
    const database = fakeDatabase();
    const path = '/downloads/lichess_db_standard_rated_2024-03.pgn.zst';

    await update(path, database);

    expect(new Set(database.read.map(([location]) => location))).toEqual(new Set([path]));
    expect(JSON.parse(database.written.get('data/lichess-games/SOURCE.json') ?? '')).toMatchObject({
      month: '2024-03',
      url: urlOf('2024-03'),
    });
  });

  it('refuses a file whose name does not say which month it is of', async () => {
    const database = fakeDatabase();

    await expect(update('/downloads/games.pgn.zst', database)).rejects.toThrow(/which month/);
    expect(database.read).toEqual([]);
  });

  it('says what it did: the games it read and counted, and the positions none of them reached', async () => {
    const database = fakeDatabase();

    const report = await update('2026-09', database);

    expect(report.source).toEqual(
      JSON.parse(database.written.get('data/lichess-games/SOURCE.json') ?? ''),
    );
    expect(report.source).toMatchObject({ month: '2026-09', games: 6, counted: 4 });
    expect(report.unreached).toEqual([positionReachedBy('1. b4 e5')]);
  });

  it('says how far it has got as it goes', async () => {
    const database = fakeDatabase();

    await update('2026-09', database);

    expect(
      database.said.filter((line) => /\d+\.\d% read.*min to go/.test(line)).length,
    ).toBeGreaterThan(0);
  });

  it.each([
    ['fails', 'fails'],
    ['comes short', 'comes short'],
  ] as const)('asks again for a part of the file that %s', async (_how, wrong) => {
    const database = fakeDatabase((from, nth) => (from === 32 && nth < 2 ? wrong : undefined));

    await update('2026-09', database);

    expect(database.read.filter(([, from]) => from === 32).length).toBe(3);
    expect(database.read.length).toBe(PARTS.length + 2);
    expect(database.paused.length).toBe(2);
    expect(database.said.filter((line) => line.includes('asking again')).length).toBe(2);
    expect(database.written.get('data/lichess-games/tallies.tsv')).toBe(expected().tallies);
  });

  it('gives up on a part of the file that keeps failing, and writes nothing', async () => {
    const database = fakeDatabase((from) => (from === 32 ? 'fails' : undefined));

    await expect(update('2026-09', database)).rejects.toThrow(/connection was lost/);
    expect(database.read.filter(([, from]) => from === 32).length).toBe(6);
    expect(database.written.size).toBe(0);
  });
});
