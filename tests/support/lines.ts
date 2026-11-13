import type { Opening } from '../../src/data/opening.ts';

type Line = Pick<Opening, 'san' | 'uci'>;

/** 1. e4 e5 2. Nf3 Nc6 3. Bc4 — five quiet moves. */
export const ITALIAN_GAME: Line = {
  san: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
  uci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
};

/**
 * 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxc6 dxc6 5. O-O Bg4 6. h3 Bxf3 7. Qxf3 Qd7 8. Qxf7+
 * — an Exchange Spanish with captures, castling and a check in it.
 */
export const EXCHANGE_SPANISH: Line = {
  san: [
    'e4',
    'e5',
    'Nf3',
    'Nc6',
    'Bb5',
    'a6',
    'Bxc6',
    'dxc6',
    'O-O',
    'Bg4',
    'h3',
    'Bxf3',
    'Qxf3',
    'Qd7',
    'Qxf7+',
  ],
  uci: [
    'e2e4',
    'e7e5',
    'g1f3',
    'b8c6',
    'f1b5',
    'a7a6',
    'b5c6',
    'd7c6',
    'e1g1',
    'c8g4',
    'h2h3',
    'g4f3',
    'd1f3',
    'd8d7',
    'f3f7',
  ],
};

/** The first `plies` moves of a line. */
export function firstMoves({ san, uci }: Line, plies: number): Line {
  return { san: san.slice(0, plies), uci: uci.slice(0, plies) };
}
