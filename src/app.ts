import './app.css';
import { createSoundEffects } from './audio/sound-effects.ts';
import { createBoardView } from './board/board-view.ts';
import { buildTimeline } from './chess/timeline.ts';
import { createPlayer } from './playback/player.ts';
import { readPreference } from './preferences.ts';

// Until the catalog arrives, the board demonstrates one line: the Italian Game.
const ITALIAN_GAME = {
  san: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
  uci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
};

export function mountApp(root: HTMLElement): void {
  const heading = document.createElement('h1');
  heading.textContent = 'Chess Openings';

  const board = createBoardView();
  const sounds = createSoundEffects({ muted: readPreference('muted', false) });
  const player = createPlayer({ board, sound: sounds.play });

  // Browsers only let audio start from a user gesture: take the first one, wherever it lands.
  for (const gesture of ['pointerdown', 'keydown'] as const) {
    document.addEventListener(gesture, sounds.unlock, { once: true });
  }

  player.load(buildTimeline(ITALIAN_GAME));
  player.play();

  root.classList.add('app');
  root.replaceChildren(heading, board.element);
}
