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
}
