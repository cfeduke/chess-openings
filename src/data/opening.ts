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

/** `[id, eco, name, san, uci]`, with each move list joined by spaces. */
type EncodedOpening = [id: string, eco: string, name: string, san: string, uci: string];

/** The shape of `openings.json`: tuples rather than objects to keep the download small. */
export interface OpeningsPayload {
  source: DataSource;
  openings: EncodedOpening[];
}

export function encodeOpenings(source: DataSource, openings: Opening[]): OpeningsPayload {
  return {
    source,
    openings: openings.map(({ id, eco, name, san, uci }) => [
      id,
      eco,
      name,
      san.join(' '),
      uci.join(' '),
    ]),
  };
}

export function decodeOpenings(payload: OpeningsPayload): Opening[] {
  return payload.openings.map(([id, eco, name, san, uci]) => ({
    id,
    eco,
    name,
    san: san.split(' '),
    uci: uci.split(' '),
  }));
}
