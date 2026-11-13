import './styles/theme.css';
import './app.css';
import { createSoundEffects } from './audio/sound-effects.ts';
import { createBoardView } from './board/board-view.ts';
import { buildTimeline } from './chess/timeline.ts';
import { el } from './dom.ts';
import { createPlayer } from './playback/player.ts';
import { clampDelay, DEFAULT_DELAY_MS } from './playback/schedule.ts';
import { preference } from './preferences.ts';
import { createMoveList } from './ui/move-list.ts';
import { bindShortcuts } from './ui/shortcuts.ts';
import { createTransport } from './ui/transport.ts';

// Until the catalog arrives, the board demonstrates one line: the Italian Game.
const ITALIAN_GAME = {
  san: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
  uci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
};

export function mountApp(root: HTMLElement): void {
  const muted = preference('muted', false, (saved) =>
    typeof saved === 'boolean' ? saved : undefined,
  );
  const delay = preference('delayMs', DEFAULT_DELAY_MS, (saved) =>
    typeof saved === 'number' ? clampDelay(saved) : undefined,
  );

  const board = createBoardView();
  const sounds = createSoundEffects({ muted });
  const player = createPlayer({ board, sound: sounds.play });
  player.setDelay(delay.read());

  const moveList = createMoveList(player);
  const transport = createTransport({
    player,
    sounds,
    saveDelay: delay.write,
    onFlip: () => board.setOrientation(board.orientation === 'white' ? 'black' : 'white'),
  });

  // Browsers only let audio start from a user gesture, and may stop it again: wake it on each.
  for (const gesture of ['click', 'keydown'] as const) {
    document.addEventListener(gesture, sounds.wake);
  }
  bindShortcuts(document, player);

  root.classList.add('app');
  root.replaceChildren(
    el(
      'header',
      { class: 'app__header' },
      el('h1', {}, 'Chess Openings'),
      el('p', { class: 'app__tagline' }, 'Learn them by watching them.'),
    ),
    el(
      'main',
      { class: 'app__main' },
      el('div', { class: 'stage' }, board.element),
      moveList.element,
    ),
    transport.element,
  );

  player.load(buildTimeline(ITALIAN_GAME));
  player.play();
}
