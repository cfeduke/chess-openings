import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { artworkOf, PIECE_KINDS, PIECE_SETS } from './piece-sets.ts';

const PIECES_DIRECTORY = new URL('./pieces/', import.meta.url);

describe('the kinds of piece', () => {
  it('are the twelve file names of a set: colour, then piece', () => {
    expect(PIECE_KINDS).toEqual([
      ...['wk', 'wq', 'wr', 'wb', 'wn', 'wp'],
      ...['bk', 'bq', 'br', 'bb', 'bn', 'bp'],
    ]);
  });
});

describe('the piece sets', () => {
  it('begin with the pieces drawn by Colin M.L. Burnett', () => {
    expect(PIECE_SETS[0]).toMatchObject({
      id: 'cburnett',
      name: 'Classic',
      credit: 'Colin M.L. Burnett',
    });
  });

  it('each have an id of their own', () => {
    const ids = PIECE_SETS.map((set) => set.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(PIECE_SETS)('$id has a different SVG for each of the twelve pieces', ({ artwork }) => {
    expect(Object.keys(artwork).sort()).toEqual([...PIECE_KINDS].sort());
    expect(new Set(Object.values(artwork)).size).toBe(12);
    for (const image of Object.values(artwork)) expect(image).toContain('svg');
  });

  it('are the directories of pieces: none undeclared, none declared and missing', () => {
    const directories = readdirSync(PIECES_DIRECTORY, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    expect(directories.sort()).toEqual(PIECE_SETS.map((set) => set.id).sort());
  });

  it.each(PIECE_SETS)('$id says under what licence its artwork is used', ({ id }) => {
    expect(existsSync(new URL(`${id}/LICENSE.md`, PIECES_DIRECTORY))).toBe(true);
  });
});

describe('finding the artwork of a set among the files', () => {
  const files = Object.fromEntries(
    PIECE_KINDS.flatMap((kind) => [
      [`./pieces/ours/${kind}.svg`, `/ours/${kind}.svg`],
      [`./pieces/theirs/${kind}.svg`, `/theirs/${kind}.svg`],
    ]),
  );

  it('takes the twelve files in the directory named after the set', () => {
    const artwork = artworkOf('ours', files);

    expect(artwork.wk).toBe('/ours/wk.svg');
    expect(artwork.bn).toBe('/ours/bn.svg');
    expect(Object.keys(artwork)).toHaveLength(12);
  });

  it('refuses a set with a piece missing, and says which', () => {
    const { './pieces/ours/bn.svg': _missing, ...incomplete } = files;

    expect(() => artworkOf('ours', incomplete)).toThrow('src/board/pieces/ours/bn.svg');
  });
});
