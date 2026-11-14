import type { StatisticsData } from '../../src/statistics/data.ts';

/**
 * A month of a million games, for the small book and the pamphlet: of each position, White's
 * wins, the draws, Black's wins and what the ratings said White would score. White scores 52%
 * of them all, against the 50.5% expected.
 */
export const SMALL_STATISTICS: StatisticsData = {
  source: {
    title: 'lichess.org open database',
    url: 'https://database.lichess.org/',
    month: '2026-10',
    games: 1_000_000,
    license: 'CC0-1.0',
  },
  positions: [
    [500_000, 40_000, 460_000, 505_000],
    // The Polish: 2,000 games.
    [1_000, 100, 900, 1_010],
    // The Scandinavian: 68,000.
    [35_000, 2_000, 31_000, 34_000],
    // The Sicilian: 92,000.
    [44_000, 4_000, 44_000, 46_000],
    // The Najdorf: 20.
    [9, 1, 10, 10],
    // Its English Attack: none.
    [0, 0, 0, 0],
    // The Italian: 39,000.
    [20_000, 1_000, 18_000, 19_500],
    // The Giuoco Pianissimo: 4,000.
    [2_000, 200, 1_800, 2_050],
    // The Slav: 150,000.
    [80_000, 10_000, 60_000, 76_000],
    // The Danish Gambit: 600.
    [330, 20, 250, 300],
  ],
  lines: {
    // The Four Knights' Italian Variation was added after the month was counted.
    eco: [1, 2, 3, 4, 5, 6, 7, -1, 8],
    // Of the pamphlet's gambits only the Danish was counted.
    pamphlet: [9, -1, -1, -1],
  },
};
