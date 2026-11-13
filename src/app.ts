import './app.css';
import { createBoardView } from './board/board-view.ts';
import { startingPosition } from './chess/board.ts';

export function mountApp(root: HTMLElement): void {
  const heading = document.createElement('h1');
  heading.textContent = 'Chess Openings';

  const board = createBoardView();
  board.setPosition(startingPosition());

  root.classList.add('app');
  root.replaceChildren(heading, board.element);
}
