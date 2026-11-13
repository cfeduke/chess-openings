import { describe, expect, it } from 'vitest';
import {
  applyMove,
  type Color,
  moveKind,
  type Piece,
  type PieceType,
  type Position,
  type Square,
  startingPosition,
} from './board.ts';

/** Plays UCI moves from the starting position and returns the last result. */
function play(...moves: string[]) {
  let position = startingPosition();
  let result: ReturnType<typeof applyMove> | undefined;
  for (const uci of moves) {
    result = applyMove(position, uci);
    position = result.position;
  }
  if (!result) throw new Error('play() needs at least one move');
  return result;
}

/** A position holding just the given pieces, e.g. `{ e1: 'wk', h1: 'wr' }`. */
function place(pieces: Partial<Record<Square, `${Color}${PieceType}`>>): Position {
  return new Map(
    Object.entries(pieces).map(([square, code]): [Square, Piece] => [
      square as Square,
      { id: square, color: code[0] as Color, type: code[1] as PieceType },
    ]),
  );
}

describe('startingPosition', () => {
  const position = startingPosition();

  it('sets up all 32 pieces', () => {
    expect(position.size).toBe(32);
    expect(position.get('e1')).toEqual({ id: 'e1', color: 'w', type: 'k' });
    expect(position.get('d8')).toEqual({ id: 'd8', color: 'b', type: 'q' });
    expect(position.get('g1')).toEqual({ id: 'g1', color: 'w', type: 'n' });
    expect(position.get('a8')).toEqual({ id: 'a8', color: 'b', type: 'r' });
    expect(position.get('c1')).toEqual({ id: 'c1', color: 'w', type: 'b' });
  });

  it('fills the second and seventh ranks with pawns and leaves the middle empty', () => {
    for (const file of 'abcdefgh') {
      expect(position.get(`${file}2` as Square)).toMatchObject({ color: 'w', type: 'p' });
      expect(position.get(`${file}7` as Square)).toMatchObject({ color: 'b', type: 'p' });
      for (const rank of '3456') expect(position.has(`${file}${rank}` as Square)).toBe(false);
    }
  });

  it('names every piece after its starting square, so each has a stable identity', () => {
    for (const [square, piece] of position) expect(piece.id).toBe(square);
  });
});

describe('applyMove', () => {
  it('moves a piece to an empty square and reports what moved', () => {
    const { position, move } = play('e2e4');

    expect(position.has('e2')).toBe(false);
    expect(position.get('e4')).toEqual({ id: 'e2', color: 'w', type: 'p' });
    expect(move).toEqual({ from: 'e2', to: 'e4', piece: { id: 'e2', color: 'w', type: 'p' } });
  });

  it('leaves the position it was given untouched', () => {
    const before = startingPosition();

    applyMove(before, 'e2e4');

    expect(before).toEqual(startingPosition());
  });

  it('reports a capture and removes the captured piece', () => {
    const { position, move } = play('e2e4', 'd7d5', 'e4d5');

    expect(move.captured).toEqual({ piece: { id: 'd7', color: 'b', type: 'p' }, square: 'd5' });
    expect(position.get('d5')).toMatchObject({ id: 'e2' });
    expect(position.size).toBe(31);
  });

  it('captures en passant: the pawn taken is not on the square moved to', () => {
    const { position, move } = play('e2e4', 'a7a6', 'e4e5', 'd7d5', 'e5d6');

    expect(move.captured).toEqual({ piece: { id: 'd7', color: 'b', type: 'p' }, square: 'd5' });
    expect(position.has('d5')).toBe(false);
    expect(position.get('d6')).toMatchObject({ id: 'e2' });
    expect(position.size).toBe(31);
  });

  describe('castling', () => {
    it.each([
      ['white kingside', { e1: 'wk', h1: 'wr' }, 'e1g1', 'h1', 'f1'],
      ['white queenside', { e1: 'wk', a1: 'wr' }, 'e1c1', 'a1', 'd1'],
      ['black kingside', { e8: 'bk', h8: 'br' }, 'e8g8', 'h8', 'f8'],
      ['black queenside', { e8: 'bk', a8: 'br' }, 'e8c8', 'a8', 'd8'],
    ] as const)('%s brings the rook across', (_, pieces, uci, rookFrom, rookTo) => {
      const { position, move } = applyMove(place(pieces), uci);

      expect(move.castle).toEqual({
        rook: expect.objectContaining({ id: rookFrom, type: 'r' }),
        from: rookFrom,
        to: rookTo,
      });
      expect(position.get(rookTo)).toMatchObject({ id: rookFrom });
      expect(position.get(uci.slice(2) as Square)).toMatchObject({ type: 'k' });
      expect(position.size).toBe(2);
    });

    it('happens in a real game', () => {
      const { position, move } = play('e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6', 'e1g1');

      expect(move.castle).toEqual({
        rook: { id: 'h1', color: 'w', type: 'r' },
        from: 'h1',
        to: 'f1',
      });
      expect(position.get('g1')).toMatchObject({ id: 'e1' });
      expect(position.get('f1')).toMatchObject({ id: 'h1' });
      expect(position.has('e1') || position.has('h1')).toBe(false);
    });

    it('is not triggered by a king stepping one square', () => {
      expect(applyMove(place({ e1: 'wk', h1: 'wr' }), 'e1f1').move.castle).toBeUndefined();
    });

    it('is not triggered by another piece travelling along the back rank', () => {
      expect(applyMove(place({ e1: 'wq', h1: 'wr' }), 'e1g1').move.castle).toBeUndefined();
    });
  });

  describe('promotion', () => {
    it('changes what the pawn is but not which piece it is', () => {
      const { position, move } = applyMove(place({ b7: 'wp' }), 'b7b8q');

      expect(move.promotion).toBe('q');
      expect(move.piece).toEqual({ id: 'b7', color: 'w', type: 'p' });
      expect(position.get('b8')).toEqual({ id: 'b7', color: 'w', type: 'q' });
    });

    it('can capture and underpromote, as in the Lasker trap', () => {
      // 1. d4 d5 2. c4 e5 3. dxe5 d4 4. e3 Bb4+ 5. Bd2 dxe3 6. Bxb4 exf2+ 7. Ke2 fxg1=N+
      const { position, move } = play(
        ...'d2d4 d7d5 c2c4 e7e5 d4e5 d5d4 e2e3 f8b4 c1d2 d4e3 d2b4 e3f2 e1e2 f2g1n'.split(' '),
      );

      expect(move.promotion).toBe('n');
      expect(move.captured).toEqual({ piece: { id: 'g1', color: 'w', type: 'n' }, square: 'g1' });
      expect(position.get('g1')).toEqual({ id: 'd7', color: 'b', type: 'n' });
    });
  });

  it('refuses to move from an empty square', () => {
    expect(() => applyMove(startingPosition(), 'e4e5')).toThrow(/no piece on e4/);
  });

  it.each(['e2-e4', 'e2', 'e2e9', 'i2i4', 'e7e8k', ''])('rejects %j as a UCI move', (uci) => {
    expect(() => applyMove(startingPosition(), uci)).toThrow(/not a UCI move/);
  });
});

describe('moveKind', () => {
  it('tells a quiet move, a capture and castling apart', () => {
    expect(moveKind(play('e2e4').move)).toBe('move');
    expect(moveKind(play('e2e4', 'd7d5', 'e4d5').move)).toBe('capture');
    expect(moveKind(play('e2e4', 'a7a6', 'e4e5', 'd7d5', 'e5d6').move)).toBe('capture');
    expect(moveKind(applyMove(place({ e1: 'wk', h1: 'wr' }), 'e1g1').move)).toBe('castle');
  });

  it('calls a capturing promotion a capture', () => {
    expect(moveKind(applyMove(place({ b7: 'wp', a8: 'br' }), 'b7a8q').move)).toBe('capture');
  });
});
