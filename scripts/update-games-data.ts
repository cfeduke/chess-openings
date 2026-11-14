// Counts a month of lichess's games for the catalog's positions:
// `node scripts/update-games-data.ts [YYYY-MM | path to a .pgn.zst]`.
import { mkdir, open, stat, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { zstdFrames } from './games/frames.ts';
import { type Interest, positionsOfInterest } from './games/interest.ts';
import { countFrames } from './games/pool.ts';
import { countedGames, gamesReaching } from './games/tally.ts';
import {
  formatTallies,
  GAMES_DIR,
  POSITIONS_FILE,
  TALLIES_FILE,
  type VendoredGames,
} from './games/vendored.ts';
import { DATA_DIR, loadDataset } from './openings/dataset.ts';
import { formatSourceFile, SOURCE_FILE, today, USER_AGENT } from './openings/source.ts';

/** The rated games of standard chess, a month to a file. */
const DATABASE = 'lichess_db_standard_rated';
const SITE = 'https://database.lichess.org/standard';
/** The months there are, as the addresses of their files, the newest first. */
const LIST = `${SITE}/list.txt`;
const urlOf = (month: string) => `${SITE}/${DATABASE}_${month}.pgn.zst`;
const MONTH_OF_FILE = new RegExp(`${DATABASE}_(\\d{4}-\\d{2})\\.pgn\\.zst$`);

/** How many times running a part of the file may be asked for again. */
const ATTEMPTS = 5;

interface UpdateIo {
  fetchText(url: string): Promise<string>;
  /** How many bytes the file at `location`, an address or a path, holds. */
  size(location: string): Promise<number>;
  /** Its bytes from the `from`th up to the `to`th, which is not among them. */
  read(location: string, from: number, to: number): Promise<Uint8Array>;
  writeFile(path: string, contents: string): Promise<void>;
  /** Today's date as `YYYY-MM-DD`. */
  today(): string;
  /** Waits `ms` milliseconds before a part of the file is asked for again. */
  pause(ms: number): Promise<unknown>;
  /** The time, in milliseconds. */
  now(): number;
  /** Says how the reading is getting on. */
  log(line: string): void;
}

/** How the reading is to be done. */
interface Settings {
  /** How many threads to count on. */
  threads: number;
  /** How many parts of the file to ask for at a time. */
  connections: number;
  /** How many parts to hold at a time, asked for or come but waiting their turn. */
  partsHeld: number;
  /** How many bytes to a part. */
  partSize: number;
}

/** What an update did. */
interface UpdateReport {
  /** What was written to the source file: which games were read, and how many were counted. */
  source: VendoredGames;
  /** The positions of interest that no game reached. */
  unreached: string[];
}

/** Which file `target` means, and which month's games are in it. */
async function fileOf(target: string | undefined, io: UpdateIo) {
  if (target && /^\d{4}-\d{2}$/.test(target)) return { month: target, location: urlOf(target) };

  const location = target ?? (await io.fetchText(LIST)).split('\n', 1)[0] ?? '';
  const [, month] = location.match(MONTH_OF_FILE) ?? [];
  if (!month) {
    throw new Error(
      `cannot tell which month ${JSON.stringify(location)} is of: ` +
        `give a month as YYYY-MM, or a file named ${DATABASE}_YYYY-MM.pgn.zst`,
    );
  }
  return { month, location };
}

/**
 * The bytes of the file at `location`, in order, asked for a part at a time and several parts
 * at once: a connection that stalls or crawls then holds up one part, which is asked for again,
 * and not the whole file. While one part is waited for the parts after it go on being asked
 * for, as many as may be held. `onBytes` is told how much of the file has been handed on.
 */
async function* inParts(
  location: string,
  io: UpdateIo,
  { connections, partsHeld, partSize }: Settings,
  onBytes: (read: number, size: number) => void,
): AsyncGenerator<Uint8Array> {
  const size = await io.size(location);

  async function part(from: number): Promise<Uint8Array> {
    const to = Math.min(from + partSize, size);
    for (let failures = 0; ; ) {
      try {
        const bytes = await io.read(location, from, to);
        if (bytes.length === to - from) return bytes;
        throw new Error(`${location}: ${bytes.length} bytes came of the ${to - from} from ${from}`);
      } catch (error) {
        if (++failures > ATTEMPTS) throw error;
        io.log(`  ${error instanceof Error ? error.message : error}: asking again`);
        await io.pause(1000 * 2 ** failures);
      }
    }
  }

  // The parts held, in the order of the file, and how many of them are still being asked for.
  const held: Promise<Uint8Array>[] = [];
  let asking = 0;
  let next = 0;
  const askForMore = () => {
    while (asking < connections && held.length < partsHeld && next < size) {
      asking++;
      const bytes = part(next).finally(() => {
        asking--;
        askForMore();
      });
      // A part that fails is heard of when its turn comes, and not before.
      bytes.catch(() => {});
      held.push(bytes);
      next += partSize;
    }
  };

  for (let read = 0; read < size; ) {
    askForMore();
    // The part being waited for is still held, until it has come.
    const bytes = await (held[0] as Promise<Uint8Array>);
    held.shift();
    read += bytes.length;
    onBytes(read, size);
    yield bytes;
  }
}

const millions = (games: number) => `${(games / 1e6).toFixed(1)} million`;

/**
 * Reads a month of games — `target` is the month, or a file of one already downloaded, or
 * nothing for the newest there is — and writes to `gamesDir` what was counted for the positions
 * of `interest`, with a record of which games they were.
 */
export async function updateGamesData(
  target: string | undefined,
  interest: Interest,
  gamesDir: string,
  io: UpdateIo,
  settings: Settings,
): Promise<UpdateReport> {
  const { month, location } = await fileOf(target, io);
  io.log(`Reading ${location} for ${interest.positions.length} positions.`);

  const began = io.now();
  let portion = 0;
  let lastSaid = began;
  const bytes = inParts(location, io, settings, (read, size) => {
    portion = read / size;
  });
  const tally = await countFrames(zstdFrames(bytes), interest, {
    threads: settings.threads,
    onProgress: (_frames, games) => {
      const now = io.now();
      if (now - lastSaid < 30_000) return;
      lastSaid = now;
      const minutesLeft = Math.ceil(((now - began) * (1 / portion - 1)) / 60_000);
      io.log(
        `  ${(portion * 100).toFixed(1)}% read, ${millions(games)} games, ` +
          `about ${minutesLeft} min to go`,
      );
    },
  });

  const files = formatTallies(interest.positions, tally);
  await io.writeFile(join(gamesDir, POSITIONS_FILE), files.positions);
  await io.writeFile(join(gamesDir, TALLIES_FILE), files.tallies);

  const source: VendoredGames = {
    database: DATABASE,
    month,
    url: urlOf(month),
    license: 'CC0-1.0',
    retrieved: io.today(),
    games: tally.games,
    counted: countedGames(tally),
    leftOut: tally.leftOut,
    depth: interest.depth,
  };
  await io.writeFile(join(gamesDir, SOURCE_FILE), formatSourceFile(source));

  const unreached = interest.positions.filter((_, index) => gamesReaching(tally, index) === 0);
  return { source, unreached };
}

/** How long a part of the file may take to arrive before it is given up and asked for again. */
const TOO_LONG = 60_000;

/** A request to the database for `url`, which is refused unless it is answered with `status`. */
async function request(url: string, status: number, init: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: { ...init.headers, 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TOO_LONG),
  });
  if (response.status !== status) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

const isAddress = (location: string) => /^https?:/.test(location);

if (import.meta.main) {
  const gamesDir = join(DATA_DIR, GAMES_DIR);
  await mkdir(gamesDir, { recursive: true });

  const report = await updateGamesData(
    process.argv[2],
    positionsOfInterest(loadDataset(DATA_DIR)),
    gamesDir,
    {
      fetchText: async (url) => {
        const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
        if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
        return response.text();
      },
      size: async (location) =>
        isAddress(location)
          ? Number((await request(location, 200, { method: 'HEAD' })).headers.get('content-length'))
          : (await stat(location)).size,
      read: async (location, from, to) => {
        if (isAddress(location)) {
          const part = await request(location, 206, {
            headers: { Range: `bytes=${from}-${to - 1}` },
          });
          return new Uint8Array(await part.arrayBuffer());
        }
        const file = await open(location);
        try {
          const { buffer, bytesRead } = await file.read(
            Buffer.allocUnsafe(to - from),
            0,
            to - from,
            from,
          );
          return buffer.subarray(0, bytesRead);
        } finally {
          await file.close();
        }
      },
      writeFile,
      today,
      pause,
      now: Date.now,
      log: console.log,
    },
    {
      // One thread is left to read the file and cut it up.
      threads: Math.max(1, availableParallelism() - 1),
      // The database turns away an address that asks for more than a handful of things at once.
      connections: 4,
      // A quarter of a gigabyte, which lets three parts overtake one that is slow four times over.
      partsHeld: 16,
      partSize: 16 << 20,
    },
  );

  const { month, games, counted, leftOut } = report.source;
  console.log(`${gamesDir}: ${counted} of the ${games} games of ${month} counted.`);
  for (const [reason, left] of Object.entries(leftOut)) {
    console.log(`  left out ${left}: ${reason}`);
  }
  console.log(`  ${report.unreached.length} positions were reached by no game.`);
  console.log('Run "npm run verify" before committing.');
}
