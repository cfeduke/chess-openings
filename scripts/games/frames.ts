/**
 * A file compressed with zstd is a run of frames, each of which can be decompressed by itself.
 * The files of the lichess database are made by pzstd, which starts a new frame for every 32 MB
 * it is given, four or five once compressed — so a file can be cut into its frames as it arrives
 * and the frames handed out to be decompressed side by side. The format is RFC 8878.
 */

/** What a frame of compressed data begins with. */
const FRAME = 0xfd2fb528;
/** What a frame to be passed over begins with, but for its last four bits. pzstd writes one before each frame. */
const SKIPPABLE = 0x184d2a50;
/** More than any frame pzstd writes by a long way, and as much as will be held in memory. */
const LONGEST_FRAME = 1 << 30;

// The sizes, in bytes, of the fields of a frame's header whose sizes two bits of it give.
const DICTIONARY_ID_SIZES = [0, 1, 2, 4];
const CONTENT_SIZE_SIZES = [0, 2, 4, 8];

/**
 * How long the frame at the start of `bytes` is and whether it is one to pass over, or nothing
 * if not enough of it is among the first `length` bytes to say.
 */
function frameAt(bytes: Buffer, length: number): { size: number; skip: boolean } | undefined {
  if (length < 8) return undefined;
  const magic = bytes.readUInt32LE(0);
  if (magic >>> 4 === SKIPPABLE >>> 4) {
    const size = 8 + bytes.readUInt32LE(4);
    return size <= length ? { size, skip: true } : undefined;
  }
  if (magic !== FRAME) throw new Error('not zstd: a frame begins with bytes no frame begins with');

  const descriptor = bytes[4] as number;
  const singleSegment = (descriptor & 0x20) !== 0;
  const hasChecksum = (descriptor & 0x04) !== 0;
  const contentSizeSize = CONTENT_SIZE_SIZES[descriptor >> 6] || (singleSegment ? 1 : 0);
  let at =
    5 + (singleSegment ? 0 : 1) + (DICTIONARY_ID_SIZES[descriptor & 3] as number) + contentSizeSize;

  // Then blocks, each saying how long it is and whether it is the last.
  for (;;) {
    if (at + 3 > length) return undefined;
    const header = bytes.readUIntLE(at, 3);
    const isRunLength = ((header >> 1) & 3) === 1;
    at += 3 + (isRunLength ? 1 : header >> 3);
    if (header & 1) {
      const size = at + (hasChecksum ? 4 : 0);
      return size <= length ? { size, skip: false } : undefined;
    }
  }
}

/**
 * Cuts zstd-compressed `bytes`, arriving in pieces of any size, into frames: each a whole frame
 * of compressed data in an array of its own, which `zstdDecompressSync` will take.
 */
export async function* zstdFrames(bytes: AsyncIterable<Uint8Array>): AsyncGenerator<Uint8Array> {
  let held = Buffer.allocUnsafe(1 << 16);
  let length = 0;

  for await (const piece of bytes) {
    if (length + piece.length > held.length) {
      if (length + piece.length > LONGEST_FRAME) {
        throw new Error('a frame of more than a gigabyte: this is not a file pzstd made');
      }
      const longer = Buffer.allocUnsafe(Math.max(held.length * 2, length + piece.length));
      held.copy(longer, 0, 0, length);
      held = longer;
    }
    held.set(piece, length);
    length += piece.length;

    let from = 0;
    for (
      let frame = frameAt(held, length);
      frame;
      frame = frameAt(held.subarray(from), length - from)
    ) {
      if (!frame.skip) yield new Uint8Array(held.subarray(from, from + frame.size));
      from += frame.size;
    }
    held.copyWithin(0, from, length);
    length -= from;
  }

  // What is left is short of a frame, unless it is too short even to be the start of one.
  if (length > 0) throw new Error('the file stops in the middle of a frame');
}
