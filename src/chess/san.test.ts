import { describe, expect, it } from 'vitest';
import { parseMoveText } from './san.ts';

describe('parseMoveText', () => {
  it('drops move numbers and keeps the moves in order', () => {
    expect(parseMoveText('1. e4 c5 2. Nf3 d6 3. d4')).toEqual(['e4', 'c5', 'Nf3', 'd6', 'd4']);
  });

  it('copes with numbers glued to moves, black-to-move ellipses and stray whitespace', () => {
    expect(parseMoveText(' 1.e4  e5 2.Nf3 2... Nc6 ')).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });

  it('keeps castling, captures, checks and promotions intact', () => {
    expect(parseMoveText('4. O-O Nxe4 5. Bxf7+ Kxf7 6. O-O-O e1=Q#')).toEqual([
      'O-O',
      'Nxe4',
      'Bxf7+',
      'Kxf7',
      'O-O-O',
      'e1=Q#',
    ]);
  });

  it('returns nothing for empty text', () => {
    expect(parseMoveText('')).toEqual([]);
  });
});
