import { applyMove, type Position, startingPosition } from '../../src/chess/board.ts';

/** The position after playing UCI moves from the start. Safe to import in browser tests. */
export function positionAfter(...moves: string[]): Position {
  return moves.reduce((position, uci) => applyMove(position, uci).position, startingPosition());
}
