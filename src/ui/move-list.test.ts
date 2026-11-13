// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fakePlayer } from '../../tests/support/fake-player.ts';
import { EXCHANGE_SPANISH, ITALIAN_GAME } from '../../tests/support/lines.ts';
import { buildTimeline } from '../chess/timeline.ts';
import { createMoveList } from './move-list.ts';

const italian = buildTimeline(ITALIAN_GAME).moves;
const spanish = buildTimeline(EXCHANGE_SPANISH).moves;

function setup(initial: Parameters<typeof fakePlayer>[0] = { moves: italian }) {
  const { player, emit } = fakePlayer(initial);
  const { element } = createMoveList(player);
  return {
    player,
    emit,
    element,
    moves: () => [...element.querySelectorAll<HTMLButtonElement>('.move')],
    current: () => element.querySelector<HTMLElement>('[aria-current="step"]'),
    pending: () => element.querySelector<HTMLElement>('.move--pending'),
  };
}

describe('the move list', () => {
  it('is a labelled region of the page', () => {
    const { element } = setup();

    expect(element.getAttribute('aria-label')).toBe('Moves');
  });

  it('numbers the moves in pairs, White then Black', () => {
    const { element } = setup();

    const rows = [...element.querySelectorAll('.move-row')].map((row) => row.textContent);
    expect(rows).toEqual(['1.e4e5', '2.Nf3Nc6', '3.Bc4']);
  });

  it('starts with an entry for the position before any move', () => {
    const { moves } = setup();

    expect(moves()[0]?.textContent).toBe('Start');
    expect(moves()[0]?.dataset.ply).toBe('0');
    expect(moves().map((move) => move.dataset.ply)).toEqual(['0', '1', '2', '3', '4', '5']);
  });

  it('names each move for a screen reader the way a player would say it', () => {
    const { moves } = setup();

    expect(moves().map((move) => move.getAttribute('aria-label'))).toEqual([
      'Start position',
      '1. e4',
      '1… e5',
      '2. Nf3',
      '2… Nc6',
      '3. Bc4',
    ]);
  });

  it('asks you to choose an opening when there are no moves to list', () => {
    const { element, moves } = setup({ moves: [] });

    expect(moves()).toEqual([]);
    expect(element.textContent).toContain('Choose an opening');
  });
});

describe('the cursor', () => {
  it('rests on the start entry before any move is made', () => {
    const { current } = setup();

    expect(current()?.textContent).toBe('Start');
    expect(current()?.classList.contains('move--current')).toBe(true);
  });

  it('points at the move that was just made', () => {
    const { emit, current, element } = setup();

    emit({ ply: 3 });

    expect(current()?.textContent).toBe('Nf3');
    expect(element.querySelectorAll('.move--current')).toHaveLength(1);

    emit({ ply: 4 });

    expect(current()?.textContent).toBe('Nc6');
    expect(element.querySelectorAll('.move--current')).toHaveLength(1);
  });

  it('is scrolled into view as it moves', () => {
    const { emit, moves } = setup({ moves: spanish });
    const scrolled = vi.fn();
    for (const move of moves()) move.scrollIntoView = scrolled;

    emit({ ply: 15 });

    expect(scrolled).toHaveBeenCalledTimes(1);
    expect(scrolled).toHaveBeenCalledWith({ block: 'nearest' });
    expect(scrolled.mock.contexts[0]).toBe(moves().at(-1));
  });

  it('stays put, and unscrolled, when something else changes', () => {
    const { emit, moves } = setup();
    emit({ ply: 2 });
    const scrolled = vi.fn();
    for (const move of moves()) move.scrollIntoView = scrolled;

    emit({ playing: true });
    emit({ delayMs: 900 });

    expect(scrolled).not.toHaveBeenCalled();
  });
});

describe('the move about to be made', () => {
  it('is marked while the board is pointing it out', () => {
    const { emit, pending, current } = setup();

    emit({ ply: 2, pending: 2 });

    expect(pending()?.textContent).toBe('Nf3');
    expect(current()?.textContent).toBe('e5');
  });

  it('is unmarked once it has been made', () => {
    const { emit, pending } = setup();
    emit({ ply: 2, pending: 2 });

    emit({ ply: 3, pending: null });

    expect(pending()).toBeNull();
  });
});

describe('clicking', () => {
  it('a move jumps to the position after it', () => {
    const { player, moves } = setup();

    moves()[4]?.click();

    expect(player.seek).toHaveBeenCalledWith(4);
  });

  it('the start entry jumps back to the beginning', () => {
    const { player, emit, moves } = setup();
    emit({ ply: 3 });

    moves()[0]?.click();

    expect(player.seek).toHaveBeenCalledWith(0);
  });
});

describe('a new line', () => {
  it('replaces the list', () => {
    const { emit, moves } = setup();

    emit({ moves: spanish, ply: 0 });

    expect(moves()).toHaveLength(16);
    expect(moves().at(-1)?.textContent).toBe('Qxf7+');
  });

  it('is the only thing that rebuilds it', () => {
    const { emit, moves } = setup();
    const before = moves();

    emit({ ply: 2, playing: true, pending: 2 });

    expect(moves()).toEqual(before);
    expect(moves()[3]).toBe(before[3]);
  });
});
