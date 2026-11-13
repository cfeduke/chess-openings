import { BOARD_THEMES, type BoardTheme } from './board-themes.ts';
import { PIECE_SETS, type PieceSet } from './piece-sets.ts';

/** A look for the board: a set of pieces on a board they go well with. */
export interface Appearance {
  readonly id: string;
  /** What the visitor chooses it by. */
  readonly name: string;
  readonly pieces: PieceSet;
  readonly board: BoardTheme;
}

/** Appearances to choose from. There is always a first, which is the one to fall back on. */
export type Appearances = readonly [Appearance, ...Appearance[]];

/** Looks a declared piece set or board theme up by its id. */
function declared<T extends { id: string }>(kind: string, among: readonly T[], id: string): T {
  const found = among.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`There is no ${kind} called "${id}"`);
  return found;
}

const appearance = (id: string, name: string, pieces: string, board: string): Appearance => ({
  id,
  name,
  pieces: declared('piece set', PIECE_SETS, pieces),
  board: declared('board theme', BOARD_THEMES, board),
});

/**
 * The appearances the site offers, the default first. To add one, pair a piece set with a board
 * theme here; the dropdown in the control bar lists whatever is declared.
 */
export const APPEARANCES: Appearances = [appearance('classic', 'Classic', 'cburnett', 'brown')];

export const DEFAULT_APPEARANCE = APPEARANCES[0];

/** The appearance called `id`, or the first of them if none is — as when one has been retired. */
export function appearanceById(id: string, among: Appearances = APPEARANCES): Appearance {
  return among.find((candidate) => candidate.id === id) ?? among[0];
}
