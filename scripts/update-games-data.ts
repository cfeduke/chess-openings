// Counts a month of lichess's games for the catalog's positions:
// `node scripts/update-games-data.ts [YYYY-MM | path to a .pgn.zst]`.
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { zstdFrames } from './games/frames.ts';
import { type Interest, positionsOfInterest } from './games/interest.ts';
import { countFrames } from './games/pool.ts';
import { countedGames, gamesReaching, type Reason } from './games/tally.ts';
import {
  formatTallies,
  GAMES_DIR,
  POSITIONS_FILE,
  TALLIES_FILE,
  type VendoredGames,
} from './games/vendored.ts';
import { DATA_DIR, loadDataset } from './openings/dataset.ts';
import { SOURCE_FILE } from './openings/source.ts';

/** The rated games of standard chess, a month to a file. */
const DATABASE = 'lichess_db_standard_rated';
const SITE = 'https://database.lichess.org/standard';
/** The months there are, as the addresses of their files, the newest first. */
const LIST = `${SITE}/list.txt`;
const urlOf = (month: string) => `${SITE}/${DATABASE}_${month}.pgn.zst`;
const MONTH_OF_FILE = new RegExp(`${DATABASE}_(\\d{4}-\\d{2})\\.pgn\\.zst$`);

/** How many times running a download may break off without having got any further. */
const ATTEMPTS = 5;

interface UpdateIo {
  fetchText(url: string): Promise<string>;
  /** The file at `location`, an address or a path, from its `from`th byte on, and its whole size. */
  open(location: string, from: number): Promise<{ bytes: AsyncIterable<Uint8Array>; size: number }>;
  writeFile(path: string, contents: string): Promise<void>;
  /** Today's date as `YYYY-MM-DD`. */
  today(): string;
  /** Waits `ms` milliseconds before a download is taken up again. */
  pause(ms: number): Promise<unknown>;
  /** Says how the reading is getting on. */
  log(line: string): void;
  /** How many threads to count on. */
  workers: number;
}

/** What an update did. */
interface UpdateReport {
  month: string;
  /** How many games the month held, how many were counted, and why the others were not. */
  games: number;
  counted: number;
  leftOut: Record<Reason, number>;
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
 * The bytes of the file at `location`, all of them: a download that breaks off or stops short
 * is taken up from where it had got to. `onBytes` is told how far that is.
 */
async function* allOf(
  location: string,
  io: UpdateIo,
  onBytes: (received: number, size: number) => void,
): AsyncGenerator<Uint8Array> {
  let received = 0;
  for (let failures = 0; ; ) {
    try {
      const { bytes, size } = await io.open(location, received);
      for await (const piece of bytes) {
        received += piece.length;
        failures = 0;
        onBytes(received, size);
        yield piece;
      }
      if (received >= size) return;
      throw new Error(`${location} stopped at byte ${received} of ${size}`);
    } catch (error) {
      if (++failures > ATTEMPTS) throw error;
      io.log(`  ${error instanceof Error ? error.message : error}: taking it up again`);
      await io.pause(1000 * 2 ** failures);
    }
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
): Promise<UpdateReport> {
  const { month, location } = await fileOf(target, io);
  io.log(`Reading ${location} for ${interest.positions.length} positions.`);

  const began = Date.now();
  let portion = 0;
  let lastSaid = began;
  const bytes = allOf(location, io, (received, size) => {
    portion = received / size;
  });
  const tally = await countFrames(zstdFrames(bytes), interest.positions, interest.depth, {
    workers: io.workers,
    onProgress: (_frames, games) => {
      const now = Date.now();
      if (now - lastSaid < 30_000 || portion === 0) return;
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

  const counted = countedGames(tally);
  const source: VendoredGames = {
    database: DATABASE,
    month,
    url: urlOf(month),
    license: 'CC0-1.0',
    retrieved: io.today(),
    games: tally.games,
    counted,
    leftOut: tally.leftOut,
    depth: interest.depth,
  };
  await io.writeFile(join(gamesDir, SOURCE_FILE), `${JSON.stringify(source, null, 2)}\n`);

  const unreached = interest.positions.filter((_, index) => gamesReaching(tally, index) === 0);
  return { month, games: tally.games, counted, leftOut: tally.leftOut, unreached };
}

/** Says who is asking. */
const USER_AGENT = 'chess-openings (https://github.com/cfeduke/chess-openings)';

/** How long a download may go without a byte arriving before it is taken to have broken off. */
const STALLED_AFTER = 60_000;

/** The file at an address, from its `from`th byte on. */
async function download(url: string, from: number) {
  const stalled = new AbortController();
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Range: `bytes=${from}-` },
    signal: stalled.signal,
  });
  // Asked for from its first byte a file may come whole; from any other, only as a part will do.
  const asAsked = response.status === 206 || (from === 0 && response.ok);
  if (!response.body || !asAsked) throw new Error(`${url}: HTTP ${response.status}`);

  const reader = response.body.getReader();
  async function* bytes(): AsyncGenerator<Uint8Array> {
    try {
      for (;;) {
        const timer = setTimeout(() => stalled.abort(new Error(`${url} stalled`)), STALLED_AFTER);
        const { done, value } = await reader.read().finally(() => clearTimeout(timer));
        if (done) return;
        yield value;
      }
    } finally {
      stalled.abort();
    }
  }
  return { bytes: bytes(), size: from + Number(response.headers.get('content-length')) };
}

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
      open: async (location, from) =>
        /^https?:/.test(location)
          ? download(location, from)
          : {
              bytes: createReadStream(location, { start: from, highWaterMark: 1 << 20 }),
              size: (await stat(location)).size,
            },
      writeFile,
      today: () => new Date().toISOString().slice(0, 10),
      pause,
      log: console.log,
      // One thread is left to read the file and cut it up.
      workers: Math.max(1, availableParallelism() - 1),
    },
  );

  const { month, games, counted, leftOut, unreached } = report;
  console.log(`${gamesDir}: ${counted} of the ${games} games of ${month} counted.`);
  for (const [reason, left] of Object.entries(leftOut))
    console.log(`  left out ${left}: ${reason}`);
  console.log(`  ${unreached.length} positions were reached by no game.`);
  console.log('Run "npm run verify" before committing.');
}
