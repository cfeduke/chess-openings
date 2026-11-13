import { type BoardTheme, BROWN } from './board-themes.ts';
import { CBURNETT, type PieceSet } from './piece-sets.ts';

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

export const DEFAULT_APPEARANCE: Appearance = {
  id: 'classic',
  name: 'Classic',
  pieces: CBURNETT,
  board: BROWN,
};

/**
 * The appearances the site offers, the default first. To add one, pair a piece set with a board
 * theme here; the dropdown in the control bar lists whatever is declared.
 */
export const APPEARANCES: Appearances = [DEFAULT_APPEARANCE];

/** The appearance called `id`, or the first of them if none is — as when one has been retired. */
export function appearanceById(id: string, among: Appearances): Appearance {
  return among.find((candidate) => candidate.id === id) ?? among[0];
}
