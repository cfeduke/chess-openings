import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { realOpenings } from '../../tests/support/real-openings.ts';
import { type Position, type Square, startingPosition } from './board.ts';
import { buildTimeline } from './timeline.ts';

/** The piece-placement field of a FEN, for comparing against a reference engine. */
function placement(position: Position): string {
  return [...'87654321']
    .map((rank) =>
      [...'abcdefgh']
        .map((file) => {
          const piece = position.get(`${file}${rank}` as Square);
          if (!piece) return '1';
          return piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
        })
        .join('')
        .replace(/1+/g, (empty) => String(empty.length)),
    )
    .join('/');
}

describe('buildTimeline', () => {
  // 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxc6 dxc6 5. O-O
  const exchangeSpanish = buildTimeline({
    san: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6', 'O-O'],
    uci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5c6', 'd7c6', 'e1g1'],
  });

  it('starts from the starting position and has one position per move after it', () => {
    expect(exchangeSpanish.positions).toHaveLength(exchangeSpanish.moves.length + 1);
    expect(exchangeSpanish.positions[0]).toEqual(startingPosition());
  });

  it('records each position reached', () => {
    expect(exchangeSpanish.positions.map(placement).slice(1, 4)).toEqual([
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR',
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR',
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R',
    ]);
    expect(placement(exchangeSpanish.positions.at(-1) as Position)).toBe(
      'r1bqkbnr/1pp2ppp/p1p5/4p3/4P3/5N2/PPPP1PPP/RNBQ1RK1',
    );
  });

  it('describes each move: its notation, what moved, and what else happened', () => {
    const [e4, , , , , , bxc6, , castles] = exchangeSpanish.moves;

    expect(e4).toEqual({
      san: 'e4',
      check: false,
      from: 'e2',
      to: 'e4',
      piece: { id: 'e2', color: 'w', type: 'p' },
    });
    expect(bxc6?.captured).toEqual({ piece: { id: 'b8', color: 'b', type: 'n' }, square: 'c6' });
    expect(castles?.castle).toMatchObject({ from: 'h1', to: 'f1' });
  });

  it('flags checks and mates from the notation', () => {
    // 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#  — and 1. e4 d5 2. Bb5+ on the way to nowhere
    const scholarsMate = buildTimeline({
      san: ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'],
      uci: ['e2e4', 'e7e5', 'd1h5', 'b8c6', 'f1c4', 'g8f6', 'h5f7'],
    });
    const check = buildTimeline({ san: ['e4', 'd5', 'Bb5+'], uci: ['e2e4', 'd7d5', 'f1b5'] });

    expect(scholarsMate.moves.map((move) => move.check)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(check.moves.at(-1)?.check).toBe(true);
  });

  it('handles a line with no moves', () => {
    expect(buildTimeline({ san: [], uci: [] })).toEqual({
      positions: [startingPosition()],
      moves: [],
    });
  });
});

describe('every line in the real dataset', () => {
  it('ends in the same position a full rules engine reaches', () => {
    // Lines share most of their moves, so ask the reference engine about each sequence once.
    const reference = new Map<string, string>([['', new Chess().fen()]]);
    const fenAfter = (uci: string[]): string => {
      const key = uci.join(' ');
      let fen = reference.get(key);
      if (!fen) {
        const game = new Chess(fenAfter(uci.slice(0, -1)));
        const last = uci.at(-1) as string;
        game.move({ from: last.slice(0, 2), to: last.slice(2, 4), promotion: last[4] });
        fen = game.fen();
        reference.set(key, fen);
      }
      return fen;
    };

    const wrong = realOpenings.filter((opening) => {
      const { positions } = buildTimeline(opening);
      return placement(positions.at(-1) as Position) !== fenAfter(opening.uci).split(' ')[0];
    });

    expect(wrong.map((opening) => opening.name)).toEqual([]);
  });

  it('has a capture, a castle and a check to show for itself', () => {
    const moves = realOpenings.flatMap((opening) => buildTimeline(opening).moves);

    expect(moves.some((move) => move.captured)).toBe(true);
    expect(moves.some((move) => move.captured && move.captured.square !== move.to)).toBe(true);
    expect(moves.some((move) => move.castle?.to === 'd1')).toBe(true);
    expect(moves.some((move) => move.check)).toBe(true);
  });
});
