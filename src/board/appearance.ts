import { type BoardTheme, BROWN } from './board-themes.ts';
import { CBURNETT, type PieceSet, pieceSet } from './piece-sets.ts';

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
 * A theme pack: pieces and a board made for each other, sharing an id — the name of the pieces'
 * directory — and a name. The artwork of a pack names no artist and is in the public domain.
 */
const pack = (id: string, name: string, colors: BoardTheme['colors']): Appearance => ({
  id,
  name,
  pieces: pieceSet(id, `from the ${name} set, in the public domain`),
  board: { id, colors },
});

/** The appearances the site offers, in the order the dropdown lists them: the default first. */
export const APPEARANCES: Appearances = [
  DEFAULT_APPEARANCE,
  pack('walnut-gold', 'Walnut & Gold', {
    light: '#f1e0be',
    dark: '#956a4a',
    'last-move': 'rgb(204 167 78 / 0.49)',
    highlight: 'rgb(255 211 93 / 0.72)',
    arrow: 'rgb(32 116 115 / 0.92)',
  }),
  pack('midnight-cyan', 'Midnight & Cyan', {
    light: '#aabbd0',
    dark: '#1f3858',
    'last-move': 'rgb(33 205 222 / 0.43)',
    highlight: 'rgb(76 236 243 / 0.67)',
    arrow: 'rgb(255 188 87 / 0.91)',
  }),
  pack('sage-sand', 'Sage & Sand', {
    light: '#f5ead6',
    dark: '#a7b69a',
    'last-move': 'rgb(204 175 104 / 0.5)',
    highlight: 'rgb(255 202 96 / 0.7)',
    arrow: 'rgb(38 102 91 / 0.88)',
  }),
  pack('slate-ivory', 'Slate & Ivory', {
    light: '#ece8e1',
    dark: '#667a83',
    'last-move': 'rgb(214 176 81 / 0.48)',
    highlight: 'rgb(251 205 86 / 0.68)',
    arrow: 'rgb(25 118 105 / 0.88)',
  }),
];

/** The appearance called `id`, or the first of them if none is — as when one has been retired. */
export function appearanceById(id: string, among: Appearances): Appearance {
  return among.find((candidate) => candidate.id === id) ?? among[0];
}
