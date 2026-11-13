import { numberedMove } from '../chess/san.ts';
import { el } from '../dom.ts';
import type { Player } from '../playback/player.ts';

/**
 * Says what is happening on the board to people who cannot see it: a live region, read out by
 * screen readers, that names each move as it is made. `say` announces anything else.
 */
export function createAnnouncer(player: Player): { element: HTMLElement; say(text: string): void } {
  const element = el('p', { class: 'announcer visually-hidden', role: 'status' });
  const say = (text: string) => {
    element.textContent = text;
  };

  let seen = player.snapshot;
  player.subscribe((snapshot) => {
    const moved = snapshot.moves === seen.moves && snapshot.ply !== seen.ply;
    seen = snapshot;
    // A line that has just been loaded is introduced by whoever loaded it.
    if (!moved) return;
    const move = snapshot.moves[snapshot.ply - 1];
    say(move ? numberedMove(move.san, snapshot.ply - 1) : 'Start position');
  });

  return { element, say };
}
