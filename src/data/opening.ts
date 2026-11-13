/** One named line from the lichess openings dataset. */
export interface Opening {
  /** Unique and URL-safe. Names are not unique: transpositions repeat them. */
  id: string;
  /** Encyclopaedia of Chess Openings code, `A00`–`E99`. */
  eco: string;
  /** `Family: Variation, Subvariation` by lichess convention. */
  name: string;
  /** Moves in standard algebraic notation, one entry per ply. */
  san: string[];
  /** The same moves as from-square/to-square pairs, e.g. `e2e4`; castling is the king's move. */
  uci: string[];
}

/** Where the dataset came from. */
export interface DataSource {
  repository: string;
  commit: string;
  license: string;
}

/** The shape of `openings.json`. */
export interface OpeningsDataset {
  source: DataSource;
  openings: Opening[];
}
