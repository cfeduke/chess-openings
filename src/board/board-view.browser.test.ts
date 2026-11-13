import { afterEach, describe, expect, it } from 'vitest';
import { STUDY } from '../../tests/support/appearances.ts';
import { positionAfter } from '../../tests/support/positions.ts';
import { type Square, startingPosition } from '../chess/board.ts';
import { type BoardView, createBoardView } from './board-view.ts';
import type { Orientation } from './geometry.ts';

const BOARD_SIZE = 480;
const SQUARE_SIZE = BOARD_SIZE / 8;

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

    view.showArrow('e2', 'e4', { durationMs: 300 });

    // It takes its time …
    const shaft = arrow().querySelector('.arrow__shaft') as SVGGraphicsElement;
    expect(getComputedStyle(shaft).strokeDashoffset).not.toBe('0px');
    await expect.poll(() => getComputedStyle(shaft).strokeDashoffset).toBe('0px');
    // … and ends with its tip at the centre of e4, having started inside e2, up the e-file.
    const drawn = arrow().getBoundingClientRect();
    expect(drawn.top).toBeCloseTo(centre(square('e4')).y, 0);
    expect(drawn.bottom).toBeGreaterThan(square('e2').getBoundingClientRect().top);
    expect(drawn.bottom).toBeLessThan(centre(square('e2')).y);
    expect(drawn.left + drawn.width / 2).toBeCloseTo(centre(square('e4')).x, 0);
  });

  it('shows the whole arrow at once when it is given no time to draw', () => {
    const { view, arrow } = mount();

    view.showArrow('g1', 'f3');

    const shaft = arrow().querySelector('.arrow__shaft') as SVGGraphicsElement;
    const head = arrow().querySelector('.arrow__head') as SVGGraphicsElement;
    expect(getComputedStyle(shaft).strokeDashoffset).toBe('0px');
    expect(getComputedStyle(head).opacity).toBe('1');
  });

  it('turns around for Black at once, even with a slide in flight', async () => {
    const { view, piece, square } = mount();
    view.setPosition(startingPosition());
    await painted();
    view.setPosition(positionAfter('e2e4'), { durationMs: 300 });

    view.setOrientation('black');

    const board = view.element.getBoundingClientRect();
    const a1 = square('a1').getBoundingClientRect();
    expect(a1.right).toBeCloseTo(board.right, 0);
    expect(a1.top).toBeCloseTo(board.top, 0);
    for (const [id, name] of [
      ['a1', 'a1'],
      ['e2', 'e4'],
    ] as const) {
      expect(centre(piece(id)).x, id).toBeCloseTo(centre(square(name)).x, 0);
      expect(centre(piece(id)).y, id).toBeCloseTo(centre(square(name)).y, 0);
    }
  });

  it('keeps a drawn arrow drawn when the board turns, rather than drawing it again', async () => {
    const { view, arrow, square } = mount();
    view.showArrow('e2', 'e4', { durationMs: 150 });
    const shaft = arrow().querySelector('.arrow__shaft') as SVGGraphicsElement;
    await expect.poll(() => getComputedStyle(shaft).strokeDashoffset).toBe('0px');

    view.setOrientation('black');

    expect(getComputedStyle(shaft).strokeDashoffset).toBe('0px');
    expect(arrow().getBoundingClientRect().bottom).toBeCloseTo(centre(square('e4')).y, 0);
  });
});

describe('the board’s appearance in a real browser', () => {
  /** What is drawn for each kind of piece in the starting position. */
  const artworkDrawn = (piece: (id: string) => HTMLElement) =>
    new Map(
      [...startingPosition().values()].map(({ id, color, type }) => [
        `${color}${type}` as const,
        getComputedStyle(piece(id)).backgroundImage,
      ]),
    );

  it('draws the pieces of the set it was given', () => {
    const { view, piece } = mount();
    view.setPosition(startingPosition());
    const before = artworkDrawn(piece);

    view.setAppearance(STUDY);

    const after = artworkDrawn(piece);
    expect(new Set(after.values()).size).toBe(12);
    for (const [kind, image] of after) {
      expect(image, kind).not.toBe(before.get(kind));
      expect(image, kind).toBe(`url("${STUDY.pieces.artwork[kind]}")`);
    }
  });

  it('paints the squares, the highlight and the arrow in the colours of its theme', () => {
    const { view, square, arrow } = mount();
    const { colors } = STUDY.board;
    view.setPosition(positionAfter('e2e4'), { lastMove: { from: 'e2', to: 'e4' } });

    view.setAppearance(STUDY);
    view.highlight('e7');
    view.showArrow('e7', 'e5');

    expect(getComputedStyle(square('a1')).backgroundColor).toBe(colors.dark);
    expect(getComputedStyle(square('h1')).backgroundColor).toBe(colors.light);
    // The coordinates are written in the colour of the other kind of square.
    expect(getComputedStyle(square('a1')).color).toBe(colors.light);
    expect(getComputedStyle(square('e4')).backgroundImage).toContain(colors['last-move']);
    expect(getComputedStyle(square('e7')).backgroundImage).toContain(colors.highlight);
    const shaft = arrow().querySelector('.arrow__shaft') as SVGGraphicsElement;
    expect(getComputedStyle(shaft).stroke).toBe(colors.arrow);
  });

  it('draws a board without being told how to look', () => {
    const { view, square, piece } = mount();
    view.setPosition(startingPosition());

    expect(getComputedStyle(square('a1')).backgroundColor).toBe('rgb(181, 136, 99)');
    expect(getComputedStyle(square('h1')).backgroundColor).toBe('rgb(240, 217, 181)');
    expect(getComputedStyle(piece('e1')).backgroundImage).toContain('svg');
  });
});
