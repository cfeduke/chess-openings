import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { EXCHANGE_SPANISH, firstMoves } from '../../tests/support/lines.ts';
import { realOpenings } from '../../tests/support/real-openings.ts';
import { type Position, type Square, startingPosition } from './board.ts';
import { givesCheck } from './san.ts';
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
  const exchangeSpanish = buildTimeline(firstMoves(EXCHANGE_SPANISH, 9));

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
      from: 'e2',
      to: 'e4',
      piece: { id: 'e2', color: 'w', type: 'p' },
    });
    expect(bxc6?.captured).toEqual({ piece: { id: 'b8', color: 'b', type: 'n' }, square: 'c6' });
    expect(castles?.castle).toMatchObject({ from: 'h1', to: 'f1' });
  });

  it('handles a line with no moves', () => {
    expect(buildTimeline({ san: [], uci: [] })).toEqual({
      positions: [startingPosition()],
      moves: [],
    });
  });
});

describe('every line in the real dataset', () => {
  const lines = realOpenings.map((opening) => ({ opening, timeline: buildTimeline(opening) }));

  it('ends in the same position a full rules engine reaches', () => {
    // Lines share most of their moves, so ask the reference engine about each sequence once.
    const reference = new Map<string, string>([['', new Chess().fen()]]);
    const fenAfter = (uci: string[]): string => {
      const key = uci.join(' ');
      let fen = reference.get(key);
      if (!fen) {
        const game = new Chess(fenAfter(uci.slice(0, -1)));
        game.move(uci.at(-1) as string);
        fen = game.fen();
        reference.set(key, fen);
      }
      return fen;
    };

    const wrong = lines.filter(
      ({ opening, timeline }) =>
        placement(timeline.positions.at(-1) as Position) !== fenAfter(opening.uci).split(' ')[0],
    );

    expect(wrong.map(({ opening }) => opening.name)).toEqual([]);
  });

  it('has a capture, an en passant capture, a long castle and a check to show for itself', () => {
    const moves = lines.flatMap(({ timeline }) => timeline.moves);

    expect(moves.some((move) => move.captured)).toBe(true);
    expect(moves.some((move) => move.captured && move.captured.square !== move.to)).toBe(true);
    expect(moves.some((move) => move.castle?.to === 'd1')).toBe(true);
    expect(moves.some((move) => givesCheck(move.san))).toBe(true);
  });
});
