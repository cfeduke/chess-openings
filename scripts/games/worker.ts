// One of the threads `pool.ts` hands frames to: it decompresses each and counts the games in it.
import { parentPort, workerData } from 'node:worker_threads';
import { zstdDecompressSync } from 'node:zlib';
import type { Interest } from './interest.ts';
import { createCounter, type Tally } from './tally.ts';

/** What a worker is sent: a frame to count, or word that there are no more. */
export type Task = { frame: number; bytes: Uint8Array } | 'finish';

/** What a worker sends back: what it made of a frame, or at the end, everything it counted. */
export type Answer = FrameCounted | { tally: Tally };

/**
 * A frame begins and ends wherever pzstd cut the file, so in the middle of a game as a rule. A
 * worker counts the games that are whole and sends back the pieces at either end, to be joined
 * to those of the frames before and after.
 */
export interface FrameCounted {
  frame: number;
  /** How many games were whole, and so counted. */
  games: number;
  /** The frame up to the first game that begins in it, or all of it if none does. */
  head: string;
  /** The frame from the last game that begins in it, or nothing if none does. */
  tail?: string;
}

/** What comes between two games: the end of a line of moves, a blank line, and the first tag. */
const BETWEEN_GAMES = '\n\n[Event ';

const { positions, depth } = workerData as Interest;
const counter = createCounter(positions, depth);

parentPort?.on('message', (task: Task) => {
  if (task === 'finish') {
    parentPort?.postMessage({ tally: counter.tally } satisfies Answer);
    return;
  }

  // Nothing that is counted is outside ASCII, and one byte to a character is quickest.
  const text = zstdDecompressSync(task.bytes).toString('latin1');
  const first = text.indexOf(BETWEEN_GAMES);
  if (first === -1) {
    parentPort?.postMessage({ frame: task.frame, games: 0, head: text } satisfies Answer);
    return;
  }

  const last = text.lastIndexOf(BETWEEN_GAMES);
  const before = counter.tally.games;
  counter.count(text.slice(first + 2, last + 2));
  parentPort?.postMessage({
    frame: task.frame,
    games: counter.tally.games - before,
    head: text.slice(0, first + 2),
    tail: text.slice(last + 2),
  } satisfies Answer);
});
