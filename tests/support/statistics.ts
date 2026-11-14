import type {
  DetailChunk,
  Outcomes,
  PositionDetail,
  StatisticsData,
} from '../../src/statistics/data.ts';

/** How `games` games went, of which White won the share `white` and one in twenty-five was drawn. */
const went = (games: number, white = 0.5): Outcomes => [
  games * white,
  games * 0.04,
  games * (0.96 - white),
];

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
  // What the detail of each position is cut up by, and how all the games fall into each.
  detail: {
    size: 256,
    bands: [0, 1200, 1600, 2000, 2400],
    speeds: ['bullet', 'blitz', 'rapid', 'classical'],
    totals: {
      bands: [200_000, 300_000, 300_000, 150_000, 50_000].map((games) => went(games)),
      speeds: [400_000, 450_000, 130_000, 20_000].map((games) => went(games)),
    },
  },
  // Five families of the small book, the most played first. The beginners play the Scandinavian
  // and the Italian, the masters the Slav and the Sicilian; White does best in the Italian.
  mostPlayed: {
    collection: 'eco',
    bands: [0, 1200, 1600, 2000, 2400],
    totals: [200_000, 300_000, 300_000, 150_000, 50_000].map((games) => went(games)),
    families: [
      { opening: 'slav-defense', counts: [10_000, 40_000, 50_000, 35_000, 15_000] },
      { opening: 'sicilian-defense', counts: [8_000, 24_000, 30_000, 20_000, 10_000] },
      { opening: 'scandinavian-defense', counts: [30_000, 20_000, 12_000, 5_000, 1_000] },
      { opening: 'italian-game', counts: [22_000, 10_000, 5_000, 1_800, 200], white: 0.55 },
      { opening: 'polish-opening', counts: [400, 600, 600, 300, 100] },
    ].map(({ opening, counts, white }) => ({
      opening,
      counts: counts.map((games) => went(games, white)),
    })),
  },
};

const NOTHING: PositionDetail = {
  bands: [0, 0, 0, 0, 0].map((games) => went(games)),
  speeds: [0, 0, 0, 0].map((games) => went(games)),
  moves: [],
  plies: 0,
  short: 0,
};

/**
 * The detail of the Italian Game's 39,000 games: mostly beginners', mostly fast, 34 moves long
 * on average and a fifth of them over within twenty. Of the moves played next the first is said
 * to lead to the Giuoco Pianissimo, which is not chess but gives the small book a line to go to.
 */
export const ITALIAN_DETAIL: PositionDetail = {
  bands: [22_000, 10_000, 5_000, 1_800, 200].map((games) => went(games, 0.55)),
  speeds: [20_000, 15_000, 3_500, 500].map((games) => went(games, 0.55)),
  moves: [
    ['Bc5', 20_000, 7],
    ['Nf6', 12_000, -1],
    ['Be7', 4_000, -1],
    ['h6', 2_000, -1],
  ],
  plies: 39_000 * 68,
  short: 7_800,
};

/** The Najdorf's twenty games: too few to say how it scores. */
export const NAJDORF_DETAIL: PositionDetail = {
  bands: [
    [0, 0, 0],
    [2, 0, 3],
    [5, 1, 4],
    [2, 0, 3],
    [0, 0, 0],
  ],
  speeds: [
    [4, 0, 6],
    [5, 1, 4],
    [0, 0, 0],
    [0, 0, 0],
  ],
  moves: [
    ['Be3', 8, 5],
    ['Bg5', 7, -1],
  ],
  plies: 20 * 80,
  short: 1,
};

/** The one file of detail the small statistics come in: a position to each place. */
export const SMALL_DETAIL: DetailChunk = SMALL_STATISTICS.positions.map((_, place) =>
  place === 6 ? ITALIAN_DETAIL : place === 4 ? NAJDORF_DETAIL : NOTHING,
);
