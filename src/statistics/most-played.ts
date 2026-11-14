import type { MostPlayedData, Outcomes } from './data.ts';

/** A family as it is ranked. */
export interface RankedFamily {
  /** The id of the family's main line. */
  opening: string;
  /** How many of the games ranked by reached it. */
  games: number;
  /** That, as a share of all the games ranked by: from 0 to 1. */
  share: number;
  /** White's score in them, a draw counting as half. There is none without a game. */
  whiteScore?: number;
}

/** How many families a ranking holds, unless it is asked for another number. */
export const MOST_PLAYED = 20;

const sum = (outcomes: Outcomes[]): Outcomes =>
  outcomes.reduce<Outcomes>(
    (total, [white, draws, black]) => [total[0] + white, total[1] + draws, total[2] + black],
    [0, 0, 0],
  );

/**
 * The families of `data`, the most played first: ranked by the share of games that reach them,
 * of all the games or — given its place among `data.bands` — of one band's. The families are
 * the same whichever is asked for; only their order differs. The first `limit` of them.
 */
export function rankMostPlayed(
  data: MostPlayedData,
  band?: number,
  limit = MOST_PLAYED,
): RankedFamily[] {
  const of = (counts: Outcomes[]) =>
    band === undefined ? sum(counts) : (counts[band] ?? [0, 0, 0]);
  const [white, draws, black] = of(data.totals);
  const total = white + draws + black;

  return data.families
    .map(({ opening, counts }): RankedFamily => {
      const [white, draws, black] = of(counts);
      const games = white + draws + black;
      const ranked = { opening, games, share: total ? games / total : 0 };
      return games ? { ...ranked, whiteScore: (white + draws / 2) / games } : ranked;
    })
    .sort((a, b) => b.share - a.share)
    .slice(0, limit);
}

/** What each band of strength is called, given the rating each begins at: `1200–1599`. */
export function bandNames(bands: number[]): string[] {
  return bands.map((floor, index) => {
    const next = bands[index + 1];
    if (index === 0 && next !== undefined) return `Under ${next}`;
    return next === undefined ? `${floor} and over` : `${floor}–${next - 1}`;
  });
}
