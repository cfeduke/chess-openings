import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { artworkOf, CBURNETT, PIECE_KINDS, PIECE_SETS } from './piece-sets.ts';

const PIECES_DIRECTORY = new URL('./pieces/', import.meta.url);

describe('the piece sets', () => {
  it('are the classic set and then the four theme packs', () => {
    expect(PIECE_SETS.map((set) => set.id)).toEqual([
      'cburnett',
      'walnut-gold',
      'midnight-cyan',
      'sage-sand',
      'slate-ivory',
    ]);
  });

  it('share no artwork with one another', () => {
    const images = PIECE_SETS.flatMap((set) => Object.values(set.artwork));

    expect(new Set(images).size).toBe(PIECE_SETS.length * 12);
  });

  it('say where their artwork comes from, in words that finish “Chess pieces …”', () => {
    const [classic, ...packs] = PIECE_SETS;

    expect(classic).toBe(CBURNETT);
    expect(CBURNETT.credit).toBe('by Colin M.L. Burnett');
    expect(packs.map((set) => set.credit)).toEqual([
      'from the Walnut & Gold set, in the public domain',
      'from the Midnight & Cyan set, in the public domain',
      'from the Sage & Sand set, in the public domain',
      'from the Slate & Ivory set, in the public domain',
    ]);
  });

  it.each(PIECE_SETS)('$id has a different SVG for each of the twelve pieces', ({ artwork }) => {
    expect(new Set(Object.values(artwork)).size).toBe(12);
    for (const image of Object.values(artwork)) expect(image).toContain('svg');
  });

  it('are the directories of pieces: none unlisted, none listed and missing', () => {
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
