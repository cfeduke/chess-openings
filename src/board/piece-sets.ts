import type { Color, PieceType } from '../chess/board.ts';

/** A colour and a piece — `wk`, `bn` — which is also the name of its file in a piece set. */
export type PieceKind = `${Color}${PieceType}`;

// biome-ignore format: one colour to a line
export const PIECE_KINDS = [
  'wk', 'wq', 'wr', 'wb', 'wn', 'wp',
  'bk', 'bq', 'br', 'bb', 'bn', 'bp',
] as const satisfies readonly PieceKind[];

/** One set of artwork for the pieces. */
export interface PieceSet {
  /** The name of its directory under `src/board/pieces/`. */
  readonly id: string;
  /** Where the artwork comes from, in words that finish the sentence “Chess pieces …”. */
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

/**
 * The piece set kept in `src/board/pieces/<id>/`: twelve SVGs named after the kinds of piece,
 * beside a LICENSE.md. Fails if a piece is missing.
 */
export const pieceSet = (id: string, credit: string): PieceSet => ({
  id,
  credit,
  artwork: artworkOf(id, FILES),
});

export const CBURNETT = pieceSet('cburnett', 'by Colin M.L. Burnett');
