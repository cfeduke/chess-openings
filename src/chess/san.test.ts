import { describe, expect, it } from 'vitest';
import {
  foldSan,
  formatMoveText,
  givesCheck,
  looksLikeSan,
  numberedMove,
  parseMoveText,
} from './san.ts';

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

describe('formatMoveText', () => {
  it('numbers the moves in pairs', () => {
    expect(formatMoveText(['e4', 'c5', 'Nf3', 'd6', 'd4'])).toBe('1. e4 c5 2. Nf3 d6 3. d4');
  });

  it('is undone by parseMoveText', () => {
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O'];

    expect(parseMoveText(formatMoveText(moves))).toEqual(moves);
  });

  it('formats no moves as nothing', () => {
    expect(formatMoveText([])).toBe('');
  });
});

describe('foldSan', () => {
  it.each([
    ['Nf3', 'nf3'],
    ['Bb4+', 'bb4'],
    ['Qxf7#', 'qxf7'],
    ['O-O', 'o-o'],
    ['0-0-0', 'o-o-o'],
    ['e8=Q+', 'e8=q'],
  ])('spells %j as %j, so sloppy and exact notation compare equal', (move, folded) => {
    expect(foldSan(move)).toBe(folded);
  });
});

describe('looksLikeSan', () => {
  it.each(['e4', 'Nf3', 'nf3', 'exd5', 'Nbd7', 'R1e2', 'O-O', '0-0-0', 'Bb4+', 'e8=Q#'])(
    'accepts %j',
    (text) => {
      expect(looksLikeSan(text)).toBe(true);
    },
  );

  it.each(['sicilian', 'B90', 'e9', 'i4', 'd', '4', '', 'O-O-O-O'])('rejects %j', (text) => {
    expect(looksLikeSan(text)).toBe(false);
  });
});

describe('givesCheck', () => {
  it.each(['Bb5+', 'Qxf7#', 'O-O+', 'fxg1=N+'])('is true for %j', (san) => {
    expect(givesCheck(san)).toBe(true);
  });

  it.each(['e4', 'Nxe5', 'O-O-O', 'e8=Q'])('is false for %j', (san) => {
    expect(givesCheck(san)).toBe(false);
  });
});

describe('numberedMove', () => {
  it('numbers White’s moves with a full stop and Black’s with an ellipsis', () => {
    expect(numberedMove('e4', 0)).toBe('1. e4');
    expect(numberedMove('e5', 1)).toBe('1… e5');
    expect(numberedMove('O-O', 8)).toBe('5. O-O');
    expect(numberedMove('Qxf7#', 13)).toBe('7… Qxf7#');
  });
});
