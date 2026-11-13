import './move-list.css';
import { moveNumber } from '../chess/san.ts';
import type { TimelineMove } from '../chess/timeline.ts';
import { el, exclusiveClass } from '../dom.ts';
import type { Player, PlayerSnapshot } from '../playback/player.ts';

/** `1. e4` for White's moves, `1… e5` for Black's: how a player would say where a move falls. */
function spoken(move: TimelineMove, index: number): string {
  return `${moveNumber(index)}${index % 2 === 0 ? '.' : '…'} ${move.san}`;
}

/**
 * The moves of the line being played, with a cursor on the one just made. Clicking a move
 * jumps to the position after it.
 */
export function createMoveList(player: Player): { element: HTMLElement } {
  const list = el('div', { class: 'move-list__moves' });
  const element = el('section', { class: 'move-list', 'aria-label': 'Moves' }, list);

  /** The line on show, and its buttons by the number of moves made once each is reached. */
  let shown: PlayerSnapshot['moves'] | undefined;
  let buttons: HTMLButtonElement[] = [];
  let cursor: HTMLButtonElement | undefined;
  const holdPending = exclusiveClass('move--pending');

  const moveButton = (ply: number, label: string, text: string) =>
    el(
      'button',
      { type: 'button', class: 'move', 'data-ply': String(ply), 'aria-label': label },
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

    const start = moveButton(0, 'Start position', 'Start');
    start.classList.add('move--start');
    buttons = [
      start,
      ...moves.map((move, index) => moveButton(index + 1, spoken(move, index), move.san)),
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
      cursor?.removeAttribute('aria-current');
      current?.setAttribute('aria-current', 'step');
      current?.scrollIntoView({ block: 'nearest' });
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
