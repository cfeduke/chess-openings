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
