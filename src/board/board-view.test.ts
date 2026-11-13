// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { positionAfter } from '../../tests/support/positions.ts';
import { applyMove, startingPosition } from '../chess/board.ts';
import { createBoardView } from './board-view.ts';
import type { Orientation } from './geometry.ts';

function setup(orientation?: Orientation) {
  const view = createBoardView({ orientation });
  const { element } = view;
  return {
    view,
    element,
    square: (name: string) => element.querySelector<HTMLElement>(`.square[data-square="${name}"]`),
    piece: (id: string) => element.querySelector<HTMLElement>(`.piece[data-piece="${id}"]`),
    pieces: () => [...element.querySelectorAll<HTMLElement>('.piece')],
    arrow: () => element.querySelector<SVGElement>('.arrow'),
    marked: (className: string) =>
      [...element.querySelectorAll<HTMLElement>(`.${className}`)]
        .map((marked) => marked.dataset.square ?? marked.dataset.piece)
        .sort(),
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
    const { view, square } = setup();

    expect(view.orientation).toBe('white');
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

  it('raises the pieces that are moving above the rest, until they land', () => {
    const { view, marked } = setup();
    view.setPosition(startingPosition());

    view.setPosition(positionAfter('g1f3'), { durationMs: 300 });

    expect(marked('piece--moving')).toEqual(['f3']);
    vi.advanceTimersByTime(300);
    expect(marked('piece--moving')).toEqual([]);
  });

  it('fades a captured piece out, then removes it', () => {
    const { view, element, piece, pieces } = setup();
    view.setPosition(positionAfter('e2e4', 'd7d5'));

    view.setPosition(positionAfter('e2e4', 'd7d5', 'e4d5'), { durationMs: 300 });

    expect(piece('d7')?.classList.contains('piece--captured')).toBe(true);
    // While it fades it no longer counts as standing on d5: the capturing pawn does.
    expect(element.querySelectorAll('.piece[data-square="d5"]')).toHaveLength(1);
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
    const { view, piece, pieces, marked } = setup();
    view.setPosition(positionAfter('e2e4', 'd7d5'));
    view.setPosition(positionAfter('e2e4', 'd7d5', 'e4d5'), { durationMs: 300 });

    view.setPosition(positionAfter('e2e4', 'd7d5', 'e4d5', 'd8d5'), { durationMs: 300 });

    expect(piece('d7')).toBeNull();
    expect(piece('e2')?.classList.contains('piece--captured')).toBe(true);
    expect(marked('piece--moving')).toEqual(['d5']);
    vi.advanceTimersByTime(300);
    expect(pieces()).toHaveLength(30);
  });

  it('moves king and rook together when castling', () => {
    const { view, piece, marked } = setup();
    const beforeCastling = positionAfter('e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6');
    view.setPosition(beforeCastling);

    view.setPosition(applyMove(beforeCastling, 'e1g1').position, { durationMs: 300 });

    expect(piece('e1')?.dataset.square).toBe('g1');
    expect(piece('h1')?.dataset.square).toBe('f1');
    expect(marked('piece--moving')).toEqual(['f1', 'g1']);
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

  it('tints the squares of the move that led to the position', () => {
    const { view, marked } = setup();

    view.setPosition(positionAfter('e2e4'), { lastMove: { from: 'e2', to: 'e4' } });
    expect(marked('square--last-move')).toEqual(['e2', 'e4']);

    view.setPosition(positionAfter('e2e4', 'e7e5'), { lastMove: { from: 'e7', to: 'e5' } });
    expect(marked('square--last-move')).toEqual(['e5', 'e7']);
  });

  it('shows no tint for a position that no move led to', () => {
    const { view, marked } = setup();
    view.setPosition(positionAfter('e2e4'), { lastMove: { from: 'e2', to: 'e4' } });

    view.setPosition(startingPosition());

    expect(marked('square--last-move')).toEqual([]);
  });

  it('drops the highlight and the arrow, which were about the position before', () => {
    const { view, element } = setup();
    view.setPosition(startingPosition());
    view.highlight('e2');
    view.showArrow('e2', 'e4');

    view.setPosition(positionAfter('e2e4'), { durationMs: 300 });

    expect(element.querySelector('.square--highlight, .piece--lifted, .arrow')).toBeNull();
  });
});

describe('highlight', () => {
  it('marks the square and lifts the piece standing on it', () => {
    const { view, marked } = setup();
    view.setPosition(startingPosition());

    view.highlight('e2');

    expect(marked('square--highlight')).toEqual(['e2']);
    expect(marked('piece--lifted')).toEqual(['e2']);
  });

  it('moves when another square is highlighted', () => {
    const { view, marked } = setup();
    view.setPosition(startingPosition());

    view.highlight('e2');
    view.highlight('g1');

    expect(marked('square--highlight')).toEqual(['g1']);
    expect(marked('piece--lifted')).toEqual(['g1']);
  });

  it('marks an empty square without lifting anything', () => {
    const { view, marked } = setup();
    view.setPosition(startingPosition());

    view.highlight('e4');

    expect(marked('square--highlight')).toEqual(['e4']);
    expect(marked('piece--lifted')).toEqual([]);
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
});

describe('clearAnnotations', () => {
  it('removes the highlight and the arrow, and leaves the pieces alone', () => {
    const { view, element, pieces } = setup();
    view.setPosition(startingPosition());
    view.highlight('e2');
    view.showArrow('e2', 'e4');

    view.clearAnnotations();

    expect(element.querySelector('.square--highlight, .piece--lifted, .arrow')).toBeNull();
    expect(pieces()).toHaveLength(32);
  });
});

describe('orientation', () => {
  it('can start from Black’s side', () => {
    const { view, square, piece } = setup('black');
    view.setPosition(startingPosition());

    expect(view.orientation).toBe('black');
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
    const drawn = arrow();

    view.setOrientation('black');

    expect(view.orientation).toBe('black');
    expect(square('a1')?.style.translate).toBe('700% 0%');
    expect(piece('e1')?.style.translate).toBe('300% 0%');
    expect(element.querySelectorAll('[data-file]')).toHaveLength(8);
    expect(square('a1')?.dataset.rank).toBeUndefined();
    expect(square('h1')?.dataset.rank).toBe('1');
    // The same arrow, re-aimed — a new one would draw itself all over again.
    expect(arrow()).toBe(drawn);
    expect(Number(arrow()?.querySelector('.arrow__shaft')?.getAttribute('x1'))).toBeCloseTo(3.5);
  });
});
