import type { Player } from '../playback/player.ts';

const KEYS: Record<string, (player: Player) => void> = {
  ' ': (player) => player.toggle(),
  ArrowLeft: (player) => player.stepBack(),
  ArrowRight: (player) => player.stepForward(),
  Home: (player) => player.seek(0),
  End: (player) => player.seek(player.snapshot.moves.length),
};

/**
 * Drives the player from the keyboard: space plays and pauses, the arrows step, Home and End
 * jump. Keys that already mean something to the focused control are left to it. Returns a
 * function that removes the shortcuts again.
 */
export function bindShortcuts(target: Document | HTMLElement, player: Player): () => void {
  const onKeydown = (event: Event) => {
    const { key, altKey, ctrlKey, metaKey } = event as KeyboardEvent;
    const action = KEYS[key];
    if (!action || altKey || ctrlKey || metaKey) return;

    const focused = event.target instanceof Element ? event.target : null;
    // Fields use all of these keys themselves; a button uses only space, to press itself.
    if (focused?.closest('input, textarea, select, [contenteditable]')) return;
    if (key === ' ' && focused?.closest('button, a, summary')) return;

    event.preventDefault();
    action(player);
  };

  target.addEventListener('keydown', onKeydown);
  return () => target.removeEventListener('keydown', onKeydown);
}
