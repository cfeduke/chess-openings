/** The colours a board is painted in. Each is the `--board-<name>` the stylesheet draws with. */
export const BOARD_COLORS = ['light', 'dark', 'last-move', 'highlight', 'arrow'] as const;

export type BoardColor = (typeof BOARD_COLORS)[number];

/** One way of colouring the board. */
export interface BoardTheme {
  readonly id: string;
  /** What a visitor would call it. */
  readonly name: string;
  /**
   * The light and dark squares, the tint laid over the squares of the last move and over the
   * square of the piece about to move, and the arrow. The tints go over both kinds of square,
   * so they want to be translucent.
   */
  readonly colors: Readonly<Record<BoardColor, string>>;
}

/** The board themes there are. To add one, declare it here. */
export const BOARD_THEMES: readonly BoardTheme[] = [
  {
    id: 'brown',
    name: 'Brown',
    colors: {
      light: '#f0d9b5',
      dark: '#b58863',
      'last-move': 'rgb(205 210 106 / 0.5)',
      highlight: 'rgb(255 214 64 / 0.65)',
      arrow: 'rgb(21 120 27 / 0.85)',
    },
  },
];
