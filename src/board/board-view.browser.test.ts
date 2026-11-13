import { afterEach, describe, expect, it } from 'vitest';
import { applyMove, type Position, type Square, startingPosition } from '../chess/board.ts';
import { type BoardView, createBoardView } from './board-view.ts';
import type { Orientation } from './geometry.ts';

const BOARD_SIZE = 480;
const SQUARE_SIZE = BOARD_SIZE / 8;

function positionAfter(...moves: string[]): Position {
  return moves.reduce((position, uci) => applyMove(position, uci).position, startingPosition());
}

function mount(orientation?: Orientation) {
  const host = document.createElement('div');
  host.style.width = `${BOARD_SIZE}px`;
  document.body.append(host);

  const view: BoardView = createBoardView({ orientation });
  host.append(view.element);

  const find = <T extends Element>(selector: string) => {
    const found = view.element.querySelector<T>(selector);
    if (!found) throw new Error(`nothing matches ${selector}`);
    return found;
  };
  return {
    view,
    square: (name: Square) => find<HTMLElement>(`.square[data-square="${name}"]`),
    piece: (id: string) => find<HTMLElement>(`.piece[data-piece="${id}"]`),
    arrow: () => find<SVGGraphicsElement>('.arrow'),
  };
}

/**
 * Lets the browser draw what is there, as it would have before anything changes on screen.
 * A frame callback runs before that frame is styled, so wait for the one after it.
 */
const painted = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

const centre = (element: Element) => {
  const { x, y, width, height } = element.getBoundingClientRect();
  return { x: x + width / 2, y: y + height / 2 };
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('the board in a real browser', () => {
  it('draws twelve different pieces', () => {
    const { view, piece } = mount();
    view.setPosition(startingPosition());

    const artwork = new Map<string, string>();
    for (const { id, color, type } of startingPosition().values()) {
      artwork.set(`${color}${type}`, getComputedStyle(piece(id)).backgroundImage);
    }

    expect(artwork.size).toBe(12);
    expect(new Set(artwork.values()).size).toBe(12);
    expect([...artwork.values()].every((image) => image.includes('svg'))).toBe(true);
  });

  it('puts every piece exactly on its square', () => {
    const { view, piece, square } = mount();
    view.setPosition(startingPosition());

    for (const name of startingPosition().keys()) {
      const onSquare = square(name).getBoundingClientRect();
      const ofPiece = piece(name).getBoundingClientRect();

      expect(ofPiece.x, name).toBeCloseTo(onSquare.x, 0);
      expect(ofPiece.y, name).toBeCloseTo(onSquare.y, 0);
      expect(ofPiece.width, name).toBeCloseTo(SQUARE_SIZE, 0);
    }
  });

  it('lifts the highlighted piece without taking it off its square', async () => {
    const { view, piece, square } = mount();
    view.setPosition(startingPosition());

    view.highlight('g1');

    // Lifted means bigger — and still centred where it stood.
    await expect
      .poll(() => piece('g1').getBoundingClientRect().width)
      .toBeGreaterThan(SQUARE_SIZE * 1.1);
    expect(centre(piece('g1')).x).toBeCloseTo(centre(square('g1')).x, 0);
    expect(centre(piece('g1')).y).toBeCloseTo(centre(square('g1')).y, 0);
  });

  it('slides a piece from its old square onto its new one', async () => {
    const { view, piece, square } = mount();
    view.setPosition(startingPosition());
    await painted();

    view.setPosition(positionAfter('e2e4'), { durationMs: 200 });

    // It sets off from e2 …
    expect(centre(piece('e2')).y).toBeGreaterThan(centre(square('e3')).y);
    // … and comes to rest on e4.
    await expect.poll(() => centre(piece('e2')).y).toBeCloseTo(centre(square('e4')).y, 0);
    expect(centre(piece('e2')).x).toBeCloseTo(centre(square('e4')).x, 0);
  });

  it('fades a captured piece out while the capturing piece arrives', async () => {
    const { view, piece, square } = mount();
    view.setPosition(positionAfter('e2e4', 'd7d5'));
    const captured = piece('d7');
    await painted();

    view.setPosition(positionAfter('e2e4', 'd7d5', 'e4d5'), { durationMs: 200 });

    // The captured pawn stays where it was taken, rather than drifting off as it shrinks.
    expect(centre(captured).x).toBeCloseTo(centre(square('d5')).x, 0);
    expect(centre(captured).y).toBeCloseTo(centre(square('d5')).y, 0);
    await expect.poll(() => Number(getComputedStyle(captured).opacity)).toBeLessThan(0.5);
    await expect.poll(() => captured.isConnected).toBe(false);
    expect(centre(piece('e2')).x).toBeCloseTo(centre(square('d5')).x, 0);
  });

  it('draws the arrow from the piece to the middle of its destination', async () => {
    const { view, arrow, square } = mount();
    view.setPosition(startingPosition());

    view.showArrow('e2', 'e4', { durationMs: 100 });

    const shaft = arrow().querySelector('.arrow__shaft') as SVGGraphicsElement;
    await expect.poll(() => getComputedStyle(shaft).strokeDashoffset).toBe('0px');
    const drawn = arrow().getBoundingClientRect();
    // Its tip is at the centre of e4 and it starts inside e2, straight up the e-file.
    expect(drawn.top).toBeCloseTo(centre(square('e4')).y, 0);
    expect(drawn.bottom).toBeGreaterThan(square('e2').getBoundingClientRect().top);
    expect(drawn.bottom).toBeLessThan(centre(square('e2')).y);
    expect(drawn.left + drawn.width / 2).toBeCloseTo(centre(square('e4')).x, 0);
  });

  it('turns around for Black, keeping pieces on their squares', () => {
    const { view, piece, square } = mount();
    view.setPosition(startingPosition());

    view.setOrientation('black');

    const board = view.element.getBoundingClientRect();
    const a1 = square('a1').getBoundingClientRect();
    expect(a1.right).toBeCloseTo(board.right, 0);
    expect(a1.top).toBeCloseTo(board.top, 0);
    expect(centre(piece('a1')).x).toBeCloseTo(centre(square('a1')).x, 0);
    expect(centre(piece('a1')).y).toBeCloseTo(centre(square('a1')).y, 0);
  });
});
