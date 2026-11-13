import { zstdCompressSync, zstdDecompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { zstdFrames } from './frames.ts';

const compress = (text: string) => zstdCompressSync(Buffer.from(text));

/** What pzstd puts before each frame: a frame to be skipped, holding the size of the next. */
function skippable(contents: number): Buffer {
  const frame = Buffer.alloc(12);
  frame.writeUInt32LE(0x184d2a50, 0);
  frame.writeUInt32LE(4, 4);
  frame.writeUInt32LE(contents, 8);
  return frame;
}

/** `bytes` as they might arrive: `size` at a time. */
async function* inPieces(bytes: Uint8Array, size: number): AsyncGenerator<Uint8Array> {
  for (let from = 0; from < bytes.length; from += size) yield bytes.subarray(from, from + size);
}

/** The text of each frame found in `bytes` arriving `size` at a time. */
async function framesOf(bytes: Uint8Array, size: number): Promise<string[]> {
  const texts: string[] = [];
  for await (const frame of zstdFrames(inPieces(bytes, size))) {
    texts.push(zstdDecompressSync(frame).toString());
  }
  return texts;
}

// Long enough, and dull enough, to be compressed into more than one block's worth of input.
const LONG = Array.from({ length: 40_000 }, (_, i) => `1. e4 e5 ${i % 97}`).join('\n');
const TEXTS = ['[Event "one"]\n', LONG, '', 'the last of them\n'];

describe('zstdFrames', () => {
  const file = Buffer.concat(TEXTS.map(compress));

  it.each([1, 7, 4096, 1 << 30])(
    'cuts a file into its frames, read %i bytes at a time',
    async (size) => {
      expect(await framesOf(file, size)).toEqual(TEXTS);
    },
  );

  it('passes over the frames that are there to be skipped, as pzstd writes them', async () => {
    const frames = TEXTS.map(compress);
    const pzstd = Buffer.concat(frames.flatMap((frame) => [skippable(frame.length), frame]));

    expect(await framesOf(pzstd, 1000)).toEqual(TEXTS);
    expect(await framesOf(Buffer.concat([pzstd, skippable(0)]), 5)).toEqual(TEXTS);
  });

  it('gives each frame bytes of its own, to be handed on', async () => {
    const buffers = new Set<ArrayBufferLike>();
    for await (const frame of zstdFrames(inPieces(file, 4096))) {
      expect(frame.byteOffset).toBe(0);
      expect(frame.byteLength).toBe(frame.buffer.byteLength);
      buffers.add(frame.buffer);
    }

    expect(buffers.size).toBe(TEXTS.length);
  });

  it('finds no frames in nothing', async () => {
    expect(await framesOf(new Uint8Array(), 10)).toEqual([]);
  });

  it('refuses a file that stops in the middle of a frame', async () => {
    await expect(framesOf(file.subarray(0, file.length - 3), 4096)).rejects.toThrow(
      /middle of a frame/,
    );
    await expect(framesOf(file.subarray(0, 2), 4096)).rejects.toThrow(/middle of a frame/);
  });

  it('refuses what is not zstd', async () => {
    await expect(framesOf(Buffer.from('[Event "Rated Blitz game"]\n'), 4096)).rejects.toThrow(
      /not zstd/,
    );
  });
});
