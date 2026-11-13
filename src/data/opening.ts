/** One named line of an opening. */
export interface Opening {
  /** Unique and URL-safe. Names are not unique: transpositions repeat them. */
  id: string;
  /** Encyclopaedia of Chess Openings code, `A00`–`E99`. */
  eco: string;
  /** For a lichess line, `Family: Variation, Subvariation` by lichess convention. */
  name: string;
  /** Moves in standard algebraic notation, one entry per ply. */
  san: string[];
  /** The same moves as from-square/to-square pairs, e.g. `e2e4`; castling is the king's move. */
  uci: string[];
}

/** Where a collection's openings came from, as the credits say it. */
export interface DataSource {
  /** What the source is called. */
  title: string;
  /** Where it is to be found, at the revision that was used. */
  url: string;
  /** Which revision that is, briefly: the first digits of a commit, say. */
  revision: string;
  /** The SPDX identifier of its licence. */
  license: string;
}

/** A body of openings from one source. How it is laid out is the catalog's business. */
export interface OpeningCollection {
  /** Names the arrangement the catalog lays it out by. */
  id: string;
  source: DataSource;
  openings: Opening[];
}

/** The shape of `openings.json`. */
export interface OpeningsDataset {
  /** In the order the catalog offers them: the first is the one a visitor arrives at. */
  collections: OpeningCollection[];
}
