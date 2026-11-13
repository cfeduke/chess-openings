import type { Color, PieceType } from '../chess/board.ts';

/** A colour and a piece — `wk`, `bn` — which is also the name of its file in a piece set. */
export type PieceKind = `${Color}${PieceType}`;

export const PIECE_KINDS: readonly PieceKind[] = (['w', 'b'] as const).flatMap((color) =>
  (['k', 'q', 'r', 'b', 'n', 'p'] as const).map((type) => `${color}${type}` as const),
);

/** One set of artwork for the pieces. */
export interface PieceSet {
  /** The name of its directory under `src/board/pieces/`. */
  readonly id: string;
  /** What a visitor would call it. */
  readonly name: string;
  /** Who drew it. */
  readonly credit: string;
  /** Where the image of each piece is. */
  readonly artwork: Readonly<Record<PieceKind, string>>;
}

/**
 * Picks the twelve images of the set `id` out of `files`, which maps the path of every piece
 * file — `./pieces/<set>/<kind>.svg` — to its address.
 */
export function artworkOf(id: string, files: Record<string, string>): Record<PieceKind, string> {
  const artwork = {} as Record<PieceKind, string>;
  for (const kind of PIECE_KINDS) {
    const image = files[`./pieces/${id}/${kind}.svg`];
    if (!image) throw new Error(`Piece set "${id}" is missing src/board/pieces/${id}/${kind}.svg`);
    artwork[kind] = image;
  }
  return artwork;
}

/** Every piece of every set, found by where it is and what it is called. */
const FILES = import.meta.glob<string>('./pieces/*/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const pieceSet = (id: string, name: string, credit: string): PieceSet => ({
  id,
  name,
  credit,
  artwork: artworkOf(id, FILES),
});

/**
 * The piece sets there are. To add one, put its twelve SVGs and a LICENSE.md in a directory
 * under `src/board/pieces/` and declare it here.
 */
export const PIECE_SETS: readonly PieceSet[] = [
  pieceSet('cburnett', 'Classic', 'Colin M.L. Burnett'),
];
