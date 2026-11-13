import type { Opening } from '../data/opening.ts';
import { applyMove, type Move, type Position, startingPosition } from './board.ts';

/** A move of a line: what it did to the board, plus what the notation says about it. */
export interface TimelineMove extends Move {
  /** The move in standard algebraic notation. */
  san: string;
  /** Whether the move gives check (or mate). */
  check: boolean;
}

/** A line played out in full: every position it passes through and every move between them. */
export interface Timeline {
  /** `positions[n]` is the board after `n` moves; `positions[0]` is the starting position. */
  positions: Position[];
  /** `moves[n]` leads from `positions[n]` to `positions[n + 1]`. */
  moves: TimelineMove[];
}

export function buildTimeline({ san, uci }: Pick<Opening, 'san' | 'uci'>): Timeline {
  const positions = [startingPosition()];
  const moves = uci.map((step, ply): TimelineMove => {
    const { position, move } = applyMove(positions[ply] as Position, step);
    positions.push(position);
    const notation = san[ply] as string;
    return { san: notation, check: /[+#]$/.test(notation), ...move };
  });
  return { positions, moves };
}
