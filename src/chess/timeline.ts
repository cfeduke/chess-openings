import type { Opening } from '../data/opening.ts';
import { applyMove, type Move, type Position, startingPosition } from './board.ts';

/** A move of a line: what it did to the board, and how it is written. */
export interface TimelineMove extends Move {
  /** The move in standard algebraic notation. */
  readonly san: string;
}

/** A line played out in full: every position it passes through and every move between them. */
export interface Timeline {
  /** `positions[n]` is the board after `n` moves; `positions[0]` is the starting position. */
  readonly positions: readonly Position[];
  /** `moves[n]` leads from `positions[n]` to `positions[n + 1]`. */
  readonly moves: readonly TimelineMove[];
}

export function buildTimeline({ san, uci }: Pick<Opening, 'san' | 'uci'>): Timeline {
  let position = startingPosition();
  const positions = [position];
  const moves: TimelineMove[] = [];
  for (const [ply, step] of uci.entries()) {
    const played = applyMove(position, step);
    position = played.position;
    positions.push(position);
    moves.push({ san: san[ply] as string, ...played.move });
  }
  return { positions, moves };
}
