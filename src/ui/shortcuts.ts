import type { Player } from '../playback/player.ts';

const KEYS: Record<string, (player: Player) => void> = {
  ' ': (player) => player.toggle(),
  ArrowLeft: (player) => player.stepBack(),
  ArrowRight: (player) => player.stepForward(),
  Home: (player) => player.seek(0),
  End: (player) => player.seek(Number.POSITIVE_INFINITY),
};

/**
 * Drives the player from the keyboard, wherever the focus is: space plays and pauses, the
 * arrows step, Home and End jump. A key that already means something to the focused control is
 * left to it. Returns a function that removes the shortcuts again.
 */
export function bindShortcuts(page: Document, player: Player): () => void {
  const onKeydown = (event: KeyboardEvent) => {
    const action = KEYS[event.key];
    if (!action || event.altKey || event.ctrlKey || event.metaKey) return;

    // A control that used the key says so by preventing its default: tabs, a tree, a menu.
    if (event.defaultPrevented) return;
    // Native fields use all of these keys without saying so; a button uses space to press itself.
    const focused = event.target instanceof Element ? event.target : null;
    if (focused?.closest('input, textarea, select, [contenteditable]')) return;
    if (event.key === ' ' && focused?.closest('button, a, summary')) return;

    event.preventDefault();
    action(player);
  };

  page.addEventListener('keydown', onKeydown);
  return () => page.removeEventListener('keydown', onKeydown);
}
