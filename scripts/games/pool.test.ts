import { zstdCompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { createReplayer } from '../openings/replay.ts';
import { createGame } from './play.ts';
import { countFrames } from './pool.ts';
import { createCounter } from './tally.ts';

const replay = createReplayer();
const positionAfter = (pgn: string) => replay('a line', pgn).positions.at(-1) as string;

const POSITIONS = [
  createGame().position(),
  positionAfter('1. e4'),
  positionAfter('1. e4 c5'),
  positionAfter('1. d4 d5'),
];
const DEPTH = 12;

const LINES = [
  '1. e4 c5 2. Nf3 d6',
  '1. e4 e5 2. Nf3 Nc6 3. Bb5',
  '1. d4 d5 2. c4',
  '1. Nf3 d5 2. d4',
];
const RESULTS = ['1-0', '0-1', '1/2-1/2'];
const EVENTS = ['Bullet', 'Blitz', 'Rapid', 'Classical', 'Correspondence'];

/** Fifty games, no two quite alike. */
const PGN = Array.from({ length: 50 }, (_, i) => {
  const result = RESULTS[i % 3];
  const tags = [
    `[Event "Rated ${EVENTS[i % 5]} game"]`,
    `[Site "https://lichess.org/game/${i}"]`,
    `[Result "${result}"]`,
    `[WhiteElo "${900 + i * 37}"]`,
    `[BlackElo "${2700 - i * 31}"]`,
  ];
  return `${tags.join('\n')}\n\n${LINES[i % 4]} { [%clk 0:01:00] } ${result}\n\n`;
}).join('');

function counted(pgn = PGN) {
  const counter = createCounter(POSITIONS, DEPTH);
  counter.count(pgn);
  return counter.tally;
}

/** `pgn` compressed in frames that begin at the bytes `cuts`, wherever in a game those fall. */
async function* framesCutAt(cuts: number[], pgn = PGN): AsyncGenerator<Uint8Array> {
  const bytes = Buffer.from(pgn);
  for (const [index, from] of [0, ...cuts].entries()) {
    yield zstdCompressSync(bytes.subarray(from, cuts[index] ?? bytes.length));
  }
}

describe('countFrames', () => {
  it('counts what a single counter would, whichever way the file is cut into frames', async () => {
    const boundary = PGN.indexOf('\n\n[Event', 2000) + 2;
    const everywhere = [
      [],
      [1000, 2000, 3000, 4000],
      // One frame without the start of a game in it, and one that is empty.
      [1000, 1010, 1020, 1020, 5000],
      // A cut where one game ends and the next begins, and cuts on either side of it.
      [boundary - 1, boundary, boundary + 1],
      Array.from({ length: 40 }, (_, i) => 97 * (i + 1)),
    ];

    for (const cuts of everywhere) {
      const tally = await countFrames(framesCutAt(cuts), POSITIONS, DEPTH, { workers: 3 });

      expect(tally, `cut at ${cuts.join(', ')}`).toEqual(counted());
    }
    expect(counted().games).toBe(50);
  });

  it('counts a file with nothing in it as no games', async () => {
    const tally = await countFrames(framesCutAt([], ''), POSITIONS, DEPTH, { workers: 2 });

    expect(tally).toEqual(counted(''));
  });

  it('says how far it has got as it goes', async () => {
    const progress: number[] = [];

    await countFrames(framesCutAt([1000, 2000, 3000]), POSITIONS, DEPTH, {
      workers: 2,
      onProgress: (frames) => progress.push(frames),
    });

    expect(progress).toEqual([1, 2, 3, 4]);
  });

  it('fails, and stops, when a frame cannot be read', async () => {
    async function* spoiled(): AsyncGenerator<Uint8Array> {
      yield zstdCompressSync(Buffer.from(PGN));
      yield Buffer.from('this is not zstd');
      yield zstdCompressSync(Buffer.from(PGN));
    }

    await expect(countFrames(spoiled(), POSITIONS, DEPTH, { workers: 2 })).rejects.toThrow();
  });

  it('fails when the file itself does', async () => {
    async function* broken(): AsyncGenerator<Uint8Array> {
      yield zstdCompressSync(Buffer.from(PGN));
      throw new Error('the connection was lost');
    }

    await expect(countFrames(broken(), POSITIONS, DEPTH, { workers: 2 })).rejects.toThrow(
      /connection was lost/,
    );
  });
});
