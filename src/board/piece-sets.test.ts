import { describe, expect, it } from 'vitest';
import { artworkOf, CBURNETT, PIECE_KINDS, pieceSet } from './piece-sets.ts';

describe('a piece set', () => {
  it('is the twelve SVGs in the directory it is named after', () => {
    expect(CBURNETT.id).toBe('cburnett');
    expect(Object.keys(CBURNETT.artwork).sort()).toEqual([...PIECE_KINDS].sort());
    expect(CBURNETT.artwork.wk).toContain('svg');
  });

  it('says where its artwork comes from, in words that finish “Chess pieces …”', () => {
    expect(CBURNETT.credit).toBe('by Colin M.L. Burnett');
    expect(pieceSet('cburnett', 'by someone else').credit).toBe('by someone else');
  });

  it('cannot be made of a directory that is not there', () => {
    expect(() => pieceSet('nowhere', 'by nobody')).toThrow('src/board/pieces/nowhere/wk.svg');
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
