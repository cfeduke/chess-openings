import { Worker } from 'node:worker_threads';
import { createCounter, mergeTallies, type Tally } from './tally.ts';
import type { Answer, FrameCounted, Task } from './worker.ts';

interface CountOptions {
  /** How many threads to count on. */
  workers: number;
  /** Told, each time a frame has been counted, how many have been and how many games were in them. */
  onProgress?(frames: number, games: number): void;
}

/**
 * Counts the games in a file that arrives as `frames` of zstd, on several threads at once: see
 * `createCounter` for what is counted. No more frames are asked for than there are threads to
 * take them, so the file is read no faster than it is counted.
 */
export async function countFrames(
  frames: AsyncIterable<Uint8Array>,
  positions: readonly string[],
  depth: number,
  { workers: threads, onProgress }: CountOptions,
): Promise<Tally> {
  const workers = Array.from(
    { length: threads },
    () => new Worker(new URL('./worker.ts', import.meta.url), { workerData: { positions, depth } }),
  );
  const idle = [...workers];

  // The games that straddle two frames are counted here, from the pieces the workers send back.
  const straddlers = createCounter(positions, depth);
  const counted = new Map<number, FrameCounted>();
  let unfinished = '';
  let joined = 0;
  let games = 0;

  /** Called when a worker has answered, to wake whoever is waiting for one to. */
  let wake = () => {};
  const failed = new Promise<never>((_, reject) => {
    for (const worker of workers) worker.once('error', reject);
  });
  failed.catch(() => {});
  const answer = () => Promise.race([new Promise<void>((resolve) => (wake = resolve)), failed]);

  for (const worker of workers) {
    worker.on('message', (message: Answer) => {
      if ('frame' in message) {
        counted.set(message.frame, message);
        games += message.games;
        // The pieces are joined in the order of the frames, whatever order they come back in.
        for (let next = counted.get(joined); next; next = counted.get(joined)) {
          counted.delete(joined++);
          unfinished += next.head;
          if (next.tail !== undefined) {
            straddlers.count(unfinished);
            unfinished = next.tail;
          }
          onProgress?.(joined, games);
        }
        idle.push(worker);
      }
      wake();
    });
  }

  try {
    let sent = 0;
    for await (const frame of frames) {
      while (idle.length === 0) await answer();
      // A frame is handed over, not copied, so it must be all there is of its buffer.
      const bytes = frame.byteLength === frame.buffer.byteLength ? frame : new Uint8Array(frame);
      const task: Task = { frame: sent++, bytes };
      idle.pop()?.postMessage(task, [bytes.buffer as ArrayBuffer]);
    }
    while (joined < sent) await answer();
    straddlers.count(unfinished);

    const tally = straddlers.tally;
    for (const worker of workers) {
      const finished = new Promise<Tally>((resolve) => {
        worker.once('message', (message: Answer) => 'tally' in message && resolve(message.tally));
      });
      worker.postMessage('finish' satisfies Task);
      mergeTallies(tally, await Promise.race([finished, failed]));
    }
    return tally;
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
}
