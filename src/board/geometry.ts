import type { Square } from '../chess/board.ts';

/** Whose side of the board is at the bottom of the screen. */
export type Orientation = 'white' | 'black';

/** A square's place on the board as displayed: column 0 is the left edge, row 0 the top. */
export interface Cell {
  column: number;
  row: number;
}

export function squareCell(square: Square, orientation: Orientation): Cell {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = Number(square[1]) - 1;
  return orientation === 'white'
    ? { column: file, row: 7 - rank }
    : { column: 7 - file, row: rank };
}

export interface Point {
  x: number;
  y: number;
}

/** An arrow in board units, where each square is 1 × 1 and (0, 0) is the top-left corner. */
export interface ArrowShape {
  shaft: { x1: number; y1: number; x2: number; y2: number };
  /** A triangle: the tip first, then the two corners of its base. */
  head: [tip: Point, left: Point, right: Point];
}

/** How far from the middle of its square the arrow starts, leaving the piece visible. */
const START_GAP = 0.3;
const HEAD_LENGTH = 0.4;
const HEAD_WIDTH = 0.44;

/** A straight arrow from the middle of one square to the middle of another. */
export function arrowGeometry(from: Square, to: Square, orientation: Orientation): ArrowShape {
  const centre = (square: Square): Point => {
    const { column, row } = squareCell(square, orientation);
    return { x: column + 0.5, y: row + 0.5 };
  };
  const start = centre(from);
  const tip = centre(to);

  const distance = Math.hypot(tip.x - start.x, tip.y - start.y);
  const along = { x: (tip.x - start.x) / distance, y: (tip.y - start.y) / distance };
  const across = { x: -along.y, y: along.x };
  const base = { x: tip.x - along.x * HEAD_LENGTH, y: tip.y - along.y * HEAD_LENGTH };
  const halfWidth = HEAD_WIDTH / 2;

  return {
    shaft: {
      x1: start.x + along.x * START_GAP,
      y1: start.y + along.y * START_GAP,
      x2: base.x,
      y2: base.y,
    },
    head: [
      tip,
      { x: base.x - across.x * halfWidth, y: base.y - across.y * halfWidth },
      { x: base.x + across.x * halfWidth, y: base.y + across.y * halfWidth },
    ],
  };
}
