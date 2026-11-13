import { type Appearance, DEFAULT_APPEARANCE } from '../../src/board/appearance.ts';
import type { BoardTheme } from '../../src/board/board-themes.ts';
import { PIECE_KINDS, type PieceKind, type PieceSet } from '../../src/board/piece-sets.ts';

/** Artwork that is plainly not the real thing: the piece's name, written out. */
const stencil = (kind: PieceKind) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><text x="6" y="30">${kind}</text></svg>`,
  )}`;

export const STENCIL: PieceSet = {
  id: 'stencil',
  credit: 'A. Tester',
  artwork: Object.fromEntries(PIECE_KINDS.map((kind) => [kind, stencil(kind)])) as Record<
    PieceKind,
    string
  >,
};

/** Colours written as a browser reports them back, so a spec can compare them as they are. */
export const SLATE: BoardTheme = {
  id: 'slate',
  colors: {
    light: 'rgb(220, 227, 234)',
    dark: 'rgb(84, 104, 128)',
    'last-move': 'rgba(90, 160, 220, 0.5)',
    highlight: 'rgba(255, 180, 60, 0.65)',
    arrow: 'rgb(200, 40, 40)',
  },
};

/** A second look, nothing like the first. */
export const STUDY: Appearance = { id: 'study', name: 'Study', pieces: STENCIL, board: SLATE };

/** What the site offers, and one more to switch to. */
export const TWO_APPEARANCES = [DEFAULT_APPEARANCE, STUDY] as const;
