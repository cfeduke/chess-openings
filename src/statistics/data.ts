/** The games the statistics were counted from, as the credits say it. */
export interface GamesSource {
  /** What the database is called. */
  title: string;
  /** Where it is to be found. */
  url: string;
  /** The month the games were played in, `YYYY-MM`. */
  month: string;
  /** How many of that month's games were counted. */
  games: number;
  /** The SPDX identifier of its licence. */
  license: string;
}

/**
 * What was counted of the games that reached a position, whatever their speed and the strength
 * of their players: the games White won, the draws, the games Black won, and what the players'
 * ratings said White would score, added up and rounded to a whole game.
 */
export type PositionCounts = [white: number, draws: number, black: number, expected: number];

/** How the games that reached a position went: White's wins, the draws, Black's wins. */
export type Outcomes = [white: number, draws: number, black: number];

/** What it takes to rank the families of a collection by how often they are played. */
export interface MostPlayedData {
  /** The id of the collection whose families these are. */
  collection: string;
  /**
   * The strengths the games are kept apart by: a game is in the highest band whose number the
   * mean of its two players' ratings reaches.
   */
  bands: number[];
  /** How all the games counted went, band by band. */
  totals: Outcomes[];
  /**
   * The families that are ranked, the most played first: each as the id of its main line, with
   * how the games that reached it went, band by band.
   */
  families: { opening: string; counts: Outcomes[] }[];
}

/** How the detail of the positions is cut up, and what any position's is a share of. */
export interface DetailIndex {
  /** How many positions there are to a file: the `place`th is in file `place / size`, rounded down. */
  size: number;
  /** The strengths the games are kept apart by, as the rating each band begins at. */
  bands: number[];
  /** The speeds they are kept apart by, as lichess calls them. */
  speeds: string[];
  /** How all the games counted went, band by band and speed by speed. */
  totals: { bands: Outcomes[]; speeds: Outcomes[] };
}

/** What there is to say of one position beyond the glance. */
export interface PositionDetail {
  /** How the games that reached it went, band by band. */
  bands: Outcomes[];
  /** And speed by speed. */
  speeds: Outcomes[];
  /**
   * The moves most played from it, the most played first: each with the games it was played in
   * and the place of the position it leads to, or `-1` where that is not one games were counted
   * for.
   */
  moves: [san: string, games: number, to: number][];
  /** How long its games were, added up: the moves of both sides. */
  plies: number;
  /** How many of them were over within twenty moves. */
  short: number;
}

/** The shape of each file of detail, `statistics/<n>.json`: its positions, in order of place. */
export type DetailChunk = PositionDetail[];

/** The shape of `statistics.json`: what the games say of each line, at a glance. */
export interface StatisticsData {
  source: GamesSource;
  /**
   * The positions games were counted for. The first is the one every game begins in: its counts
   * are the totals, which any other position's are a share of.
   */
  positions: PositionCounts[];
  /**
   * For each collection, by its id, the place in `positions` of the position each of its
   * openings ends in, in the order `openings.json` lists them. Openings that end in the same
   * position have the same place. An opening that was not in the catalog when the games were
   * counted has none, which is written `-1`.
   */
  lines: Record<string, number[]>;
  /** The families of the encyclopaedia to rank by how often they are played. */
  mostPlayed?: MostPlayedData;
  /** Where the detail of each position is to be had, for the panel of one opening's numbers. */
  detail?: DetailIndex;
}
