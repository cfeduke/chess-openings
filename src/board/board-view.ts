import './board.css';
import { FILES, type Move, type Piece, type Position, RANKS, type Square } from '../chess/board.ts';
import { arrowGeometry, type Cell, type Orientation, squareCell } from './geometry.ts';

/** The chess board on screen. */
export interface BoardView {
  readonly element: HTMLElement;
  readonly orientation: Orientation;
  /**
   * Shows `position`, tinting the squares of `lastMove`, the move that led to it. Pieces that
   * were already on the board slide to their new squares over `durationMs` and pieces that are
   * gone fade out; without a duration the change is immediate.
   *
   * The highlight and the arrow are about the move to come, so a new position clears them.
   */
  setPosition(
    position: Position,
    options?: { lastMove?: Pick<Move, 'from' | 'to'>; durationMs?: number },
  ): void;
  /** Marks the square of the piece that is about to move, and lifts the piece. */
  highlight(square: Square): void;
  /** Draws an arrow from one square to another over `durationMs`, replacing any other. */
  showArrow(from: Square, to: Square, options?: { durationMs?: number }): void;
  /** Removes the highlight and the arrow. */
  clearAnnotations(): void;
  setOrientation(orientation: Orientation): void;
}

function svg(name: string, attributes: Record<string, string | number> = {}): SVGElement {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  setAttributes(element, attributes);
  return element;
}

function setAttributes(element: Element, attributes: Record<string, string | number>): void {
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
}

function div(className: string): HTMLElement {
  const element = document.createElement('div');
  element.className = className;
  return element;
}

/**
 * A CSS class held by a changing set of elements. The returned function hands the class to
 * `holders` and takes it away from whoever held it before.
 */
function exclusiveClass(className: string): (holders: (Element | undefined)[]) => void {
  let current: Element[] = [];
  return (holders) => {
    for (const holder of current) holder.classList.remove(className);
    current = holders.filter((holder) => holder !== undefined);
    for (const holder of current) holder.classList.add(className);
  };
}

/** Board units with float noise rounded away, for SVG attributes. */
const unit = (value: number) => Number(value.toFixed(3));

export function createBoardView(options: { orientation?: Orientation } = {}): BoardView {
  let orientation = options.orientation ?? 'white';

  const element = div('board');
  setAttributes(element, { role: 'img', 'aria-label': 'Chess board' });

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

  // What is on the board. This is the state; classes and data attributes only reflect it.
  /** One element follows one piece for as long as it is on the board. */
  const pieces = new Map<Piece['id'], { element: HTMLElement; square: Square }>();
  /** Captured pieces that are still fading out. */
  let leaving: HTMLElement[] = [];
  let settling: ReturnType<typeof setTimeout> | undefined;
  let arrow: { from: Square; to: Square; shaft: SVGElement; head: SVGElement } | undefined;

  const holdHighlight = exclusiveClass('square--highlight');
  const holdLastMove = exclusiveClass('square--last-move');
  const holdLifted = exclusiveClass('piece--lifted');
  const holdMoving = exclusiveClass('piece--moving');

  // Placement uses the `translate` property rather than `transform`, so that the stylesheet's
  // `scale` (a lifted or captured piece) grows a piece where it stands instead of flinging it.
  const place = (target: HTMLElement, square: Square): Cell => {
    const cell = squareCell(square, orientation);
    target.style.translate = `${cell.column * 100}% ${cell.row * 100}%`;
    return cell;
  };

  /** Aims the arrow's existing shapes, so that re-aiming it does not draw it afresh. */
  const aimArrow = () => {
    if (!arrow) return;
    const { shaft, head } = arrowGeometry(arrow.from, arrow.to, orientation);
    setAttributes(arrow.shaft, {
      x1: unit(shaft.x1),
      y1: unit(shaft.y1),
      x2: unit(shaft.x2),
      y2: unit(shaft.y2),
    });
    setAttributes(arrow.head, {
      points: head.map(({ x, y }) => `${unit(x)},${unit(y)}`).join(' '),
    });
  };

  /** Puts everything where the current orientation says it goes. */
  const layOut = () => {
    for (const [name, square] of squares) {
      const { column, row } = place(square, name);
      // Coordinates run along the bottom and left edges, whichever way the board faces.
      if (row === 7) square.dataset.file = name[0];
      else delete square.dataset.file;
      if (column === 0) square.dataset.rank = name[1];
      else delete square.dataset.rank;
    }
    for (const piece of pieces.values()) place(piece.element, piece.square);
    aimArrow();
  };

  /** Finishes the last animated change: captured pieces go, moving pieces settle. */
  const settle = () => {
    clearTimeout(settling);
    for (const captured of leaving) captured.remove();
    leaving = [];
    holdMoving([]);
  };

  const clearAnnotations = () => {
    holdHighlight([]);
    holdLifted([]);
    arrow = undefined;
    arrowsLayer.replaceChildren();
  };

  layOut();

  return {
    element,

    get orientation() {
      return orientation;
    },

    setPosition(position, { lastMove, durationMs = 0 } = {}) {
      settle();
      clearAnnotations();
      element.style.setProperty('--move-ms', `${durationMs}ms`);
      const animated = durationMs > 0;

      const moving: HTMLElement[] = [];
      const present = new Set<Piece['id']>();
      for (const [square, { id, color, type }] of position) {
        present.add(id);
        let piece = pieces.get(id);
        if (!piece) {
          piece = { element: div('piece'), square };
          piece.element.dataset.piece = id;
          pieces.set(id, piece);
          piecesLayer.append(piece.element);
        } else if (animated && piece.square !== square) {
          moving.push(piece.element);
        }
        piece.square = square;
        // One class per kind — `wk`, `bb` — since `b` alone is both "black" and "bishop".
        piece.element.className = `piece piece--${color}${type}`;
        piece.element.dataset.square = square;
        place(piece.element, square);
      }

      for (const [id, piece] of pieces) {
        if (present.has(id)) continue;
        pieces.delete(id);
        if (!animated) {
          piece.element.remove();
          continue;
        }
        // It fades where it was taken, but no longer stands there: the capturing piece does.
        delete piece.element.dataset.square;
        piece.element.classList.add('piece--captured');
        leaving.push(piece.element);
      }

      holdMoving(moving);
      holdLastMove(lastMove ? [squares.get(lastMove.from), squares.get(lastMove.to)] : []);
      if (animated) settling = setTimeout(settle, durationMs);
    },

    highlight(square) {
      holdHighlight([squares.get(square)]);
      holdLifted([[...pieces.values()].find((piece) => piece.square === square)?.element]);
    },

    showArrow(from, to, { durationMs = 0 } = {}) {
      element.style.setProperty('--arrow-ms', `${durationMs}ms`);
      const shaft = svg('line', { class: 'arrow__shaft', pathLength: 1 });
      const head = svg('polygon', { class: 'arrow__head' });
      const group = svg('g', { class: 'arrow', 'data-from': from, 'data-to': to });
      group.append(shaft, head);
      arrow = { from, to, shaft, head };
      aimArrow();
      arrowsLayer.replaceChildren(group);
    },

    clearAnnotations,

    setOrientation(next) {
      if (next === orientation) return;
      orientation = next;
      // A turn is not a move: nothing slides, and anything mid-slide arrives at once.
      settle();
      element.style.setProperty('--move-ms', '0ms');
      layOut();
    },
  };
}
