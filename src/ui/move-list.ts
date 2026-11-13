import './move-list.css';
import { moveNumber, numberedMove, START_POSITION } from '../chess/san.ts';
import { el, exclusiveAttribute, exclusiveClass, revealWithin } from '../dom.ts';
import type { Player, PlayerSnapshot } from '../playback/player.ts';

/**
 * The moves of the line being played, with a cursor on the one just made. Clicking a move
 * jumps to the position after it.
 */
export function createMoveList(player: Player): { element: HTMLElement } {
  const list = el('div', { class: 'move-list__moves' });
  const title = el('h2', { class: 'move-list__title', id: 'moves-title' }, 'Moves');
  const element = el('section', { class: 'move-list', 'aria-labelledby': title.id }, title, list);

  /** The line on show, and its buttons by the number of moves made once each is reached. */
  let shown: PlayerSnapshot['moves'] | undefined;
  let buttons: HTMLButtonElement[] = [];
  let cursor: HTMLButtonElement | undefined;
  const holdCursor = exclusiveAttribute('aria-current', 'step');
  const holdPending = exclusiveClass('move--pending');

  const moveButton = (ply: number, label: string, text: string) =>
    el(
      'button',
      { type: 'button', class: 'move', 'data-ply': ply, 'aria-label': label, tabindex: -1 },
      text,
    );

  const rebuild = (moves: PlayerSnapshot['moves']) => {
    shown = moves;
    cursor = undefined;
    if (moves.length === 0) {
      buttons = [];
      list.replaceChildren(
        el('p', { class: 'move-list__empty' }, 'Choose an opening to see its moves.'),
      );
      return;
    }

    const start = moveButton(0, START_POSITION, 'Start');
    start.classList.add('move--start');
    buttons = [
      start,
      ...moves.map((move, index) => moveButton(index + 1, numberedMove(move.san, index), move.san)),
    ];

    const rows = el('ol', { class: 'move-list__rows' });
    for (let index = 0; index < moves.length; index += 2) {
      const number = el('span', { class: 'move-row__number' }, `${moveNumber(index)}.`);
      rows.append(el('li', { class: 'move-row' }, number, ...buttons.slice(index + 1, index + 3)));
    }
    list.replaceChildren(start, rows);
  };

  const render = ({ moves, ply, pending }: PlayerSnapshot) => {
    if (moves !== shown) rebuild(moves);

    const current = buttons[ply];
    if (current !== cursor) {
      // The list is one stop in the tab order — the cursor — and a focus inside it follows along.
      const focusInside = list.contains(document.activeElement);
      cursor?.setAttribute('tabindex', '-1');
      current?.setAttribute('tabindex', '0');
      holdCursor([current]);
      if (current) revealWithin(list, current);
      if (focusInside) current?.focus();
      cursor = current;
    }
    holdPending([pending === null ? undefined : buttons[pending + 1]]);
  };

  list.addEventListener('click', (event) => {
    const move = (event.target as Element).closest<HTMLElement>('.move');
    if (move) player.seek(Number(move.dataset.ply));
  });

  render(player.snapshot);
  player.subscribe(render);
  return { element };
}
