// One of the threads `pool.ts` hands frames to: it decompresses each and counts the games in it.
import { parentPort, workerData } from 'node:worker_threads';
import { zstdDecompressSync } from 'node:zlib';
import type { Interest } from './interest.ts';
import { cutAtGames } from './pgn.ts';
import { createCounter, type Tally } from './tally.ts';

/** What a worker is sent: a frame to count, or word that there are no more. */
export type Task = { frame: number; bytes: Uint8Array } | 'finish';

/** What a worker sends back: what it made of a frame, or at the end, everything it counted. */
export type Answer = FrameCounted | { tally: Tally };

/**
 * A frame begins and ends wherever pzstd cut the file, so in the middle of a game as a rule. A
 * worker counts the games that are whole and sends back the pieces at either end, to be joined
 * to those of the frames before and after: see `cutAtGames`.
 */
export interface FrameCounted {
  frame: number;
  /** How many games were whole, and so counted. */
  games: number;
  head: string;
  tail?: string;
}

const port = parentPort;
if (!port) throw new Error('worker.ts is a worker thread, to be started by pool.ts');
const reply = (answer: Answer) => port.postMessage(answer);

const { positions, depth } = workerData as Interest;
const counter = createCounter(positions, depth);

port.on('message', (task: Task) => {
  if (task === 'finish') {
    reply({ tally: counter.tally });
    return;
  }
  // Nothing that is counted is outside ASCII, and one byte to a character is quickest.
  const { head, whole, tail } = cutAtGames(zstdDecompressSync(task.bytes).toString('latin1'));
  const before = counter.tally.games;
  counter.count(whole);
  reply({ frame: task.frame, games: counter.tally.games - before, head, tail });
});
