/** The colours a board is painted in. Each is the `--board-<name>` the stylesheet draws with. */
export type BoardColor = 'light' | 'dark' | 'last-move' | 'highlight' | 'arrow';

/** One way of colouring the board. */
export interface BoardTheme {
  readonly id: string;
  /**
   * The light and dark squares, the tint laid over the squares of the last move and over the
   * square of the piece about to move, and the arrow. The tints go over both kinds of square,
   * so they want to be translucent.
   */
  readonly colors: Readonly<Record<BoardColor, string>>;
}

// To add a board theme, declare it here and list it in BOARD_THEMES.

export const BROWN: BoardTheme = {
  id: 'brown',
  colors: {
    light: '#f0d9b5',
    dark: '#b58863',
    'last-move': 'rgb(205 210 106 / 0.5)',
    highlight: 'rgb(255 214 64 / 0.65)',
    arrow: 'rgb(21 120 27 / 0.85)',
  },
};

export const WALNUT_GOLD: BoardTheme = {
  id: 'walnut-gold',
  colors: {
    light: '#f1e0be',
    dark: '#956a4a',
    'last-move': 'rgb(204 167 78 / 0.49)',
    highlight: 'rgb(255 211 93 / 0.72)',
    arrow: 'rgb(32 116 115 / 0.92)',
  },
};

export const MIDNIGHT_CYAN: BoardTheme = {
  id: 'midnight-cyan',
  colors: {
    light: '#aabbd0',
    dark: '#1f3858',
    'last-move': 'rgb(33 205 222 / 0.43)',
    highlight: 'rgb(76 236 243 / 0.67)',
    arrow: 'rgb(255 188 87 / 0.91)',
  },
};

export const SAGE_SAND: BoardTheme = {
  id: 'sage-sand',
  colors: {
    light: '#f5ead6',
    dark: '#a7b69a',
    'last-move': 'rgb(204 175 104 / 0.5)',
    highlight: 'rgb(255 202 96 / 0.7)',
    arrow: 'rgb(38 102 91 / 0.88)',
  },
};

export const SLATE_IVORY: BoardTheme = {
  id: 'slate-ivory',
  colors: {
    light: '#ece8e1',
    dark: '#667a83',
    'last-move': 'rgb(214 176 81 / 0.48)',
    highlight: 'rgb(251 205 86 / 0.68)',
    arrow: 'rgb(25 118 105 / 0.88)',
  },
};

export const BOARD_THEMES: readonly BoardTheme[] = [
  BROWN,
  WALNUT_GOLD,
  MIDNIGHT_CYAN,
  SAGE_SAND,
  SLATE_IVORY,
];
