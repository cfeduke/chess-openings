import './board.css';
import type { File, Move, Piece, Position, Rank, Square } from '../chess/board.ts';
import { arrowGeometry, type Orientation, squareCell } from './geometry.ts';

/** The chess board on screen. */
export interface BoardView {
  readonly element: HTMLElement;
  readonly orientation: Orientation;
  /**
   * Shows `position`. Pieces that were already on the board slide to their new squares over
   * `durationMs` and pieces that are gone fade out; without a duration the change is immediate.
   */
  setPosition(position: Position, options?: { durationMs?: number }): void;
  /** Marks the square of the piece that is about to move, or nothing with `null`. */
  highlight(square: Square | null): void;
  /** Draws an arrow from one square to another over `durationMs`, replacing any other. */
  showArrow(from: Square, to: Square, options?: { durationMs?: number }): void;
  /** Removes the highlight and the arrow. */
  clearAnnotations(): void;
  /** Tints the squares the last move left and reached, or none with `null`. */
  setLastMove(move: Pick<Move, 'from' | 'to'> | null): void;
  setOrientation(orientation: Orientation): void;
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const FILES = [...'abcdefgh'] as File[];
const RANKS = [...'12345678'] as Rank[];

function svg(name: string, attributes: Record<string, string | number>): SVGElement {
  const element = document.createElementNS(SVG_NAMESPACE, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function div(className: string): HTMLElement {
  const element = document.createElement('div');
  element.className = className;
  return element;
}

/** Board units with float noise rounded away, for SVG attributes. */
const unit = (value: number) => Number(value.toFixed(3));

export function createBoardView(options: { orientation?: Orientation } = {}): BoardView {
  let orientation = options.orientation ?? 'white';
  let arrow: { from: Square; to: Square } | null = null;
  let settling: ReturnType<typeof setTimeout> | undefined;

  const element = div('board');
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', 'Chess board');

  const squaresLayer = div('board__squares');
  const piecesLayer = div('board__pieces');
  const arrowsLayer = svg('svg', { class: 'board__arrows', viewBox: '0 0 8 8' });
  for (const layer of [squaresLayer, piecesLayer, arrowsLayer])
    layer.setAttribute('aria-hidden', 'true');
  element.append(squaresLayer, piecesLayer, arrowsLayer);

  const squares = new Map<Square, HTMLElement>();
  FILES.forEach((file, fileIndex) => {
    RANKS.forEach((rank, rankIndex) => {
      const square = div(`square square--${(fileIndex + rankIndex) % 2 === 0 ? 'dark' : 'light'}`);
      square.dataset.square = `${file}${rank}`;
      squares.set(`${file}${rank}`, square);
      squaresLayer.append(square);
    });
  });

  /** Piece elements by piece id: one element follows one piece for as long as it is on the board. */
  const pieces = new Map<Piece['id'], HTMLElement>();

  // Placement uses the `translate` property rather than `transform`, so that the stylesheet's
  // `scale` (a lifted or captured piece) grows a piece where it stands instead of flinging it.
  const place = (target: HTMLElement, square: Square) => {
    const { column, row } = squareCell(square, orientation);
    target.style.translate = `${column * 100}% ${row * 100}%`;
  };

  /** Puts everything where the current orientation says it goes. */
  const layOut = () => {
    element.dataset.orientation = orientation;
    for (const [name, square] of squares) {
      place(square, name);
      const { column, row } = squareCell(name, orientation);
      // Coordinates run along the bottom and left edges, whichever way the board faces.
      if (row === 7) square.dataset.file = name[0];
      else delete square.dataset.file;
      if (column === 0) square.dataset.rank = name[1];
      else delete square.dataset.rank;
    }
    for (const piece of pieces.values()) place(piece, piece.dataset.square as Square);
    if (arrow) drawArrow(arrow.from, arrow.to);
  };

  /** Finishes the last animated change: captured pieces go, moving pieces settle. */
  const settle = () => {
    clearTimeout(settling);
    for (const captured of piecesLayer.querySelectorAll('.piece--captured')) captured.remove();
    for (const moving of piecesLayer.querySelectorAll('.piece--moving')) {
      moving.classList.remove('piece--moving');
    }
  };

  const drawArrow = (from: Square, to: Square) => {
    const { shaft, head } = arrowGeometry(from, to, orientation);
    const group = svg('g', { class: 'arrow', 'data-from': from, 'data-to': to });
    group.append(
      svg('line', {
        class: 'arrow__shaft',
        pathLength: 1,
        x1: unit(shaft.x1),
        y1: unit(shaft.y1),
        x2: unit(shaft.x2),
        y2: unit(shaft.y2),
      }),
      svg('polygon', {
        class: 'arrow__head',
        points: head.map(({ x, y }) => `${unit(x)},${unit(y)}`).join(' '),
      }),
    );
    arrowsLayer.replaceChildren(group);
  };

  const view: BoardView = {
    element,

    get orientation() {
      return orientation;
    },

    setPosition(position, { durationMs = 0 } = {}) {
      settle();
      view.highlight(null);
      element.style.setProperty('--move-ms', `${durationMs}ms`);
      const animated = durationMs > 0;

      const present = new Set<Piece['id']>();
      for (const [square, piece] of position) {
        present.add(piece.id);
        let target = pieces.get(piece.id);
        const moving = animated && target !== undefined && target.dataset.square !== square;
        if (!target) {
          target = div('piece');
          target.dataset.piece = piece.id;
          pieces.set(piece.id, target);
          piecesLayer.append(target);
        }
        // One class per kind — `wk`, `bb` — since `b` alone is both "black" and "bishop".
        const look = `piece piece--${piece.color}${piece.type}`;
        target.className = moving ? `${look} piece--moving` : look;
        target.dataset.square = square;
        place(target, square);
      }

      for (const [id, target] of pieces) {
        if (present.has(id)) continue;
        pieces.delete(id);
        if (animated) target.classList.add('piece--captured');
        else target.remove();
      }
      if (animated) settling = setTimeout(settle, durationMs);
    },

    highlight(square) {
      element.querySelector('.square--highlight')?.classList.remove('square--highlight');
      element.querySelector('.piece--lifted')?.classList.remove('piece--lifted');
      if (!square) return;
      squares.get(square)?.classList.add('square--highlight');
      piecesLayer
        .querySelector(`.piece[data-square="${square}"]:not(.piece--captured)`)
        ?.classList.add('piece--lifted');
    },

    showArrow(from, to, { durationMs = 0 } = {}) {
      element.style.setProperty('--arrow-ms', `${durationMs}ms`);
      arrow = { from, to };
      drawArrow(from, to);
    },

    clearAnnotations() {
      view.highlight(null);
      arrow = null;
      arrowsLayer.replaceChildren();
    },

    setLastMove(move) {
      for (const square of element.querySelectorAll('.square--last-move')) {
        square.classList.remove('square--last-move');
      }
      if (!move) return;
      squares.get(move.from)?.classList.add('square--last-move');
      squares.get(move.to)?.classList.add('square--last-move');
    },

    setOrientation(next) {
      if (next === orientation) return;
      orientation = next;
      settle();
      element.style.setProperty('--move-ms', '0ms');
      layOut();
    },
  };

  layOut();
  return view;
}
