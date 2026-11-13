// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMove, type Position, startingPosition } from '../chess/board.ts';
import { createBoardView } from './board-view.ts';

/** The position after playing UCI moves from the start. */
function positionAfter(...moves: string[]): Position {
  return moves.reduce((position, uci) => applyMove(position, uci).position, startingPosition());
}

function setup(orientation?: 'white' | 'black') {
  const view = createBoardView({ orientation });
  const { element } = view;
  return {
    view,
    element,
    square: (name: string) => element.querySelector<HTMLElement>(`.square[data-square="${name}"]`),
    piece: (id: string) => element.querySelector<HTMLElement>(`.piece[data-piece="${id}"]`),
    pieces: () => [...element.querySelectorAll<HTMLElement>('.piece')],
    arrow: () => element.querySelector<SVGElement>('.arrow'),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the board', () => {
  it('has 64 squares, light and dark', () => {
    const { element, square } = setup();

    expect(element.querySelectorAll('.square')).toHaveLength(64);
    expect(square('a1')?.classList.contains('square--dark')).toBe(true);
    expect(square('h1')?.classList.contains('square--light')).toBe(true);
    expect(square('d8')?.classList.contains('square--dark')).toBe(true);
    expect(square('e4')?.classList.contains('square--light')).toBe(true);
  });

  it('lays the squares out from White’s side by default', () => {
    const { square } = setup();

    expect(square('a8')?.style.translate).toBe('0% 0%');
    expect(square('h1')?.style.translate).toBe('700% 700%');
  });

  it('labels the files along the bottom and the ranks down the left', () => {
    const { element, square } = setup();

    expect(square('a1')?.dataset.file).toBe('a');
    expect(square('h1')?.dataset.file).toBe('h');
    expect(square('a1')?.dataset.rank).toBe('1');
    expect(square('a8')?.dataset.rank).toBe('8');
    expect(element.querySelectorAll('[data-file]')).toHaveLength(8);
    expect(element.querySelectorAll('[data-rank]')).toHaveLength(8);
  });

  it('is presented to assistive technology as a single image', () => {
    const { element } = setup();

    expect(element.getAttribute('role')).toBe('img');
    expect(element.getAttribute('aria-label')).toBe('Chess board');
  });
});

describe('setPosition', () => {
  it('shows every piece on its square', () => {
    const { view, piece, pieces } = setup();

    view.setPosition(startingPosition());

    // One class per kind of piece: `b` alone would mean both "black" and "bishop".
    expect(pieces()).toHaveLength(32);
    expect(piece('e1')?.className).toBe('piece piece--wk');
    expect(piece('e1')?.dataset.square).toBe('e1');
    expect(piece('e1')?.style.translate).toBe('400% 700%');
    expect(piece('a8')?.className).toBe('piece piece--br');
    expect(piece('a8')?.style.translate).toBe('0% 0%');
  });

  it('moves the same element when a piece moves, so the browser can animate it', () => {
    const { view, piece, pieces } = setup();
    view.setPosition(startingPosition());
    const pawn = piece('e2');

    view.setPosition(positionAfter('e2e4'), { durationMs: 300 });

    expect(piece('e2')).toBe(pawn);
    expect(pawn?.dataset.square).toBe('e4');
    expect(pawn?.style.translate).toBe('400% 400%');
    expect(pieces()).toHaveLength(32);
  });

  it('tells the stylesheet how long the slide should take', () => {
    const { view, element } = setup();
    view.setPosition(startingPosition());
    expect(element.style.getPropertyValue('--move-ms')).toBe('0ms');

    view.setPosition(positionAfter('e2e4'), { durationMs: 300 });

    expect(element.style.getPropertyValue('--move-ms')).toBe('300ms');
  });

  it('raises the pieces that are moving above the rest, until they land', () => {
    const { view, piece } = setup();
    view.setPosition(startingPosition());

    view.setPosition(positionAfter('g1f3'), { durationMs: 300 });

    expect(piece('g1')?.classList.contains('piece--moving')).toBe(true);
    expect(piece('e2')?.classList.contains('piece--moving')).toBe(false);
    vi.advanceTimersByTime(300);
    expect(piece('g1')?.classList.contains('piece--moving')).toBe(false);
  });

  it('fades a captured piece out, then removes it', () => {
    const { view, piece, pieces } = setup();
    view.setPosition(positionAfter('e2e4', 'd7d5'));

    view.setPosition(positionAfter('e2e4', 'd7d5', 'e4d5'), { durationMs: 300 });

    expect(piece('d7')?.classList.contains('piece--captured')).toBe(true);
    expect(piece('e2')?.dataset.square).toBe('d5');
    vi.advanceTimersByTime(299);
    expect(piece('d7')).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(piece('d7')).toBeNull();
    expect(pieces()).toHaveLength(31);
  });

  it('removes a captured piece at once when the change is not animated', () => {
    const { view, piece } = setup();
    view.setPosition(positionAfter('e2e4', 'd7d5'));

    view.setPosition(positionAfter('e2e4', 'd7d5', 'e4d5'));

    expect(piece('d7')).toBeNull();
  });

  it('finishes the previous change before starting the next', () => {
    const { view, piece, pieces } = setup();
    view.setPosition(positionAfter('e2e4', 'd7d5'));
    view.setPosition(positionAfter('e2e4', 'd7d5', 'e4d5'), { durationMs: 300 });

    view.setPosition(positionAfter('e2e4', 'd7d5', 'e4d5', 'd8d5'), { durationMs: 300 });

    expect(piece('d7')).toBeNull();
    expect(piece('e2')?.classList.contains('piece--captured')).toBe(true);
    expect(piece('d8')?.classList.contains('piece--moving')).toBe(true);
    vi.advanceTimersByTime(300);
    expect(pieces()).toHaveLength(30);
  });

  it('moves king and rook together when castling', () => {
    const { view, piece } = setup();
    const beforeCastling = positionAfter('e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6');
    view.setPosition(beforeCastling);

    view.setPosition(applyMove(beforeCastling, 'e1g1').position, { durationMs: 300 });

    expect(piece('e1')?.dataset.square).toBe('g1');
    expect(piece('h1')?.dataset.square).toBe('f1');
    expect(piece('e1')?.classList.contains('piece--moving')).toBe(true);
    expect(piece('h1')?.classList.contains('piece--moving')).toBe(true);
  });

  it('changes the look of a pawn that promotes', () => {
    const { view, piece } = setup();
    const beforePromotion = new Map([['b7', { id: 'b2', color: 'w', type: 'p' }]] as const);
    view.setPosition(beforePromotion);
    const pawn = piece('b2');

    view.setPosition(applyMove(beforePromotion, 'b7b8q').position, { durationMs: 300 });

    expect(piece('b2')).toBe(pawn);
    expect(pawn?.className).toBe('piece piece--wq piece--moving');
  });

  it('brings a captured piece back when stepping backwards', () => {
    const { view, piece, pieces } = setup();
    view.setPosition(positionAfter('e2e4', 'd7d5', 'e4d5'));

    view.setPosition(positionAfter('e2e4', 'd7d5'), { durationMs: 300 });

    expect(pieces()).toHaveLength(32);
    expect(piece('d7')?.dataset.square).toBe('d5');
    expect(piece('e2')?.dataset.square).toBe('e4');
  });
});

describe('highlight', () => {
  it('marks the square and lifts the piece standing on it', () => {
    const { view, square, piece } = setup();
    view.setPosition(startingPosition());

    view.highlight('e2');

    expect(square('e2')?.classList.contains('square--highlight')).toBe(true);
    expect(piece('e2')?.classList.contains('piece--lifted')).toBe(true);
  });

  it('moves when another square is highlighted, and clears with null', () => {
    const { view, element } = setup();
    view.setPosition(startingPosition());

    view.highlight('e2');
    view.highlight('g1');

    expect(element.querySelectorAll('.square--highlight')).toHaveLength(1);
    expect(element.querySelector('.square--highlight')?.getAttribute('data-square')).toBe('g1');
    expect(element.querySelector('.piece--lifted')?.getAttribute('data-piece')).toBe('g1');

    view.highlight(null);

    expect(element.querySelector('.square--highlight, .piece--lifted')).toBeNull();
  });

  it('lets go of the piece once it has moved', () => {
    const { view, piece, element } = setup();
    view.setPosition(startingPosition());
    view.highlight('e2');

    view.setPosition(positionAfter('e2e4'), { durationMs: 300 });

    expect(piece('e2')?.classList.contains('piece--lifted')).toBe(false);
    expect(element.querySelector('.square--highlight')).toBeNull();
  });
});

describe('showArrow', () => {
  it('draws one arrow between the two squares', () => {
    const { view, arrow, element } = setup();

    view.showArrow('e2', 'e4');

    expect(element.querySelectorAll('.arrow')).toHaveLength(1);
    expect(arrow()?.dataset.from).toBe('e2');
    expect(arrow()?.dataset.to).toBe('e4');
    const shaft = arrow()?.querySelector('.arrow__shaft');
    expect(Number(shaft?.getAttribute('x1'))).toBeCloseTo(4.5);
    expect(Number(shaft?.getAttribute('x2'))).toBeCloseTo(4.5);
    expect(arrow()?.querySelector('.arrow__head')?.getAttribute('points')).toMatch(/^4\.5,4\.5 /);
  });

  it('replaces the previous arrow', () => {
    const { view, arrow, element } = setup();

    view.showArrow('e2', 'e4');
    view.showArrow('g1', 'f3');

    expect(element.querySelectorAll('.arrow')).toHaveLength(1);
    expect(arrow()?.dataset.from).toBe('g1');
  });

  it('tells the stylesheet how long drawing it should take', () => {
    const { view, element } = setup();

    view.showArrow('e2', 'e4', { durationMs: 250 });

    expect(element.style.getPropertyValue('--arrow-ms')).toBe('250ms');
  });
});

describe('clearAnnotations', () => {
  it('removes the highlight and the arrow', () => {
    const { view, element } = setup();
    view.setPosition(startingPosition());
    view.highlight('e2');
    view.showArrow('e2', 'e4');

    view.clearAnnotations();

    expect(element.querySelector('.square--highlight, .piece--lifted, .arrow')).toBeNull();
  });
});

describe('setLastMove', () => {
  it('tints the squares a move left and reached', () => {
    const { view, element } = setup();

    view.setLastMove({ from: 'e2', to: 'e4' });

    const tinted = [...element.querySelectorAll('.square--last-move')];
    expect(tinted.map((square) => square.getAttribute('data-square')).sort()).toEqual(['e2', 'e4']);
  });

  it('follows the latest move and clears with null', () => {
    const { view, element } = setup();
    view.setLastMove({ from: 'e2', to: 'e4' });

    view.setLastMove({ from: 'e7', to: 'e5' });
    expect(element.querySelectorAll('.square--last-move')).toHaveLength(2);
    expect(element.querySelector('.square--last-move[data-square="e2"]')).toBeNull();

    view.setLastMove(null);
    expect(element.querySelector('.square--last-move')).toBeNull();
  });
});

describe('orientation', () => {
  it('can start from Black’s side', () => {
    const { view, element, square, piece } = setup('black');
    view.setPosition(startingPosition());

    expect(view.orientation).toBe('black');
    expect(element.dataset.orientation).toBe('black');
    expect(square('a8')?.style.translate).toBe('700% 700%');
    expect(piece('e1')?.style.translate).toBe('300% 0%');
    expect(square('h8')?.dataset.file).toBe('h');
    expect(square('h8')?.dataset.rank).toBe('8');
    expect(square('a1')?.dataset.file).toBeUndefined();
  });

  it('turns everything around when flipped: squares, pieces, labels and the arrow', () => {
    const { view, element, square, piece, arrow } = setup();
    view.setPosition(startingPosition());
    view.showArrow('e2', 'e4');

    view.setOrientation('black');

    expect(square('a1')?.style.translate).toBe('700% 0%');
    expect(piece('e1')?.style.translate).toBe('300% 0%');
    expect(element.querySelectorAll('[data-file]')).toHaveLength(8);
    expect(square('a1')?.dataset.rank).toBeUndefined();
    expect(square('h1')?.dataset.rank).toBe('1');
    expect(Number(arrow()?.querySelector('.arrow__shaft')?.getAttribute('x1'))).toBeCloseTo(3.5);
  });

  it('does not animate the turn', () => {
    const { view, element } = setup();
    view.setPosition(startingPosition());
    view.setPosition(positionAfter('e2e4'), { durationMs: 300 });

    view.setOrientation('black');

    expect(element.style.getPropertyValue('--move-ms')).toBe('0ms');
  });
});
