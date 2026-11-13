// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { fakePlayer } from '../../tests/support/fake-player.ts';
import { ITALIAN_MOVES as italian, SPANISH_MOVES as spanish } from '../../tests/support/lines.ts';
import { createMoveList } from './move-list.ts';

function setup(initial: Parameters<typeof fakePlayer>[0] = { moves: italian }) {
  const { player, emit } = fakePlayer(initial);
  const { element } = createMoveList(player);
  return {
    player,
    emit,
    element,
    moves: () => [...element.querySelectorAll<HTMLButtonElement>('.move')],
    current: () =>
      [...element.querySelectorAll<HTMLElement>('[aria-current="step"]')].map(
        (move) => move.textContent,
      ),
    pending: () => element.querySelector<HTMLElement>('.move--pending'),
  };
}

describe('the move list', () => {
  it('is a region of the page, named by its heading', () => {
    const { element } = setup();
    const heading = element.querySelector('h2');

    expect(heading?.textContent).toBe('Moves');
    expect(element.getAttribute('aria-labelledby')).toBe(heading?.id);
  });

  it('numbers the moves in pairs, White then Black', () => {
    const { element } = setup();

    const rows = [...element.querySelectorAll('.move-row')].map((row) => row.textContent);
    expect(rows).toEqual(['1.e4e5', '2.Nf3Nc6', '3.Bc4']);
  });

  it('starts with an entry for the position before any move', () => {
    const { moves } = setup();

    expect(moves()[0]?.textContent).toBe('Start');
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

    expect(current()).toEqual(['Start']);
  });

  it('points at the move that was just made', () => {
    const { emit, current } = setup();

    emit({ ply: 3 });
    expect(current()).toEqual(['Nf3']);

    emit({ ply: 4 });
    expect(current()).toEqual(['Nc6']);
  });
});

describe('for the keyboard', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('is a single stop in the tab order: the move the cursor is on', () => {
    const { emit, moves } = setup();
    const stops = () => moves().map((move) => move.tabIndex);
    expect(stops()).toEqual([0, -1, -1, -1, -1, -1]);

    emit({ ply: 3 });

    expect(stops()).toEqual([-1, -1, -1, 0, -1, -1]);
  });

  it('keeps the focus on the cursor as it moves, if the focus was in the list', () => {
    const { emit, moves, element } = setup();
    document.body.append(element);
    moves()[0]?.focus();

    emit({ ply: 2 });

    expect(document.activeElement).toBe(moves()[2]);
  });

  it('leaves the focus alone when it is somewhere else', () => {
    const { emit, element } = setup();
    const elsewhere = document.createElement('button');
    document.body.append(element, elsewhere);
    elsewhere.focus();

    emit({ ply: 2 });

    expect(document.activeElement).toBe(elsewhere);
  });
});

describe('the move about to be made', () => {
  it('is marked while the board is pointing it out', () => {
    const { emit, pending, current } = setup();

    emit({ ply: 2, pending: 2 });

    expect(pending()?.textContent).toBe('Nf3');
    expect(current()).toEqual(['e5']);
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
