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

const pieceSet = (id: string, credit: string): PieceSet => ({
  id,
  credit,
  artwork: artworkOf(id, FILES),
});

// To add a piece set, put its twelve SVGs and a LICENSE.md in a directory under
// `src/board/pieces/`, declare it here and list it in PIECE_SETS.

export const CBURNETT = pieceSet('cburnett', 'by Colin M.L. Burnett');

/** One of the theme packs: original artwork that names no artist, dedicated to the public domain. */
const packSet = (id: string, name: string) =>
  pieceSet(id, `from the ${name} set, in the public domain`);

export const WALNUT_GOLD = packSet('walnut-gold', 'Walnut & Gold');
export const MIDNIGHT_CYAN = packSet('midnight-cyan', 'Midnight & Cyan');
export const SAGE_SAND = packSet('sage-sand', 'Sage & Sand');
export const SLATE_IVORY = packSet('slate-ivory', 'Slate & Ivory');

export const PIECE_SETS: readonly PieceSet[] = [
  CBURNETT,
  WALNUT_GOLD,
  MIDNIGHT_CYAN,
  SAGE_SAND,
  SLATE_IVORY,
];
