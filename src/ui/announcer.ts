import { numberedMove, START_POSITION } from '../chess/san.ts';
import type { Opening } from '../data/opening.ts';
import { el } from '../dom.ts';
import type { Player } from '../playback/player.ts';

/**
 * Says what is happening on the board to people who cannot see it: a live region, read out by
 * screen readers, that introduces each opening and names each move as it is made.
 */
export function createAnnouncer(player: Player): {
  element: HTMLElement;
  /** Announces an opening that has just been put on the board. */
  introduce(opening: Opening): void;
} {
  const element = el('p', { class: 'announcer visually-hidden', role: 'status' });

  /** A live region is only read out when it changes, so saying the same again must change it. */
  const say = (text: string) => {
    element.textContent = text === element.textContent ? `${text} ` : text;
  };

  let seen = player.snapshot;
  player.subscribe((snapshot) => {
    const moved = snapshot.moves === seen.moves && snapshot.ply !== seen.ply;
    seen = snapshot;
    // A new line arriving is not a move: it gets an introduction instead.
    if (!moved) return;
    const move = snapshot.moves[snapshot.ply - 1];
    say(move ? numberedMove(move.san, snapshot.ply - 1) : START_POSITION);
  });

  return {
    element,
    introduce({ name, san }) {
      say(`${name}, ${san.length} ${san.length === 1 ? 'move' : 'moves'}`);
    },
  };
}
