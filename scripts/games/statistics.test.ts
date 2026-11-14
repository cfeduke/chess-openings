import { describe, expect, it } from 'vitest';
import type { OpeningsDataset } from '../../src/data/opening.ts';
import { countGames, lichessGame as game } from '../../tests/support/games.ts';
import { encyclopaedia, LICHESS, opening } from '../../tests/support/openings.ts';
import { realDataset } from '../../tests/support/real-openings.ts';
import { realStatistics } from '../../tests/support/real-statistics.ts';
import { positionsOfInterest } from './interest.ts';
import { buildStatistics } from './statistics.ts';
import type { GameTallies, VendoredGames } from './vendored.ts';

const SICILIAN = opening('B20', 'Sicilian Defense', 'e4 c5');
const OPEN_SICILIAN = opening('B27', 'Sicilian Defense: Open', 'e4 c5 Nf3');
const POLISH = opening('A00', 'Polish Opening', 'b4');
/** The same position as the open Sicilian, come to another way. */
const BY_ANOTHER_ROAD = opening('A04', 'Zukertort Opening: Sicilian Invitation', 'Nf3 c5 e4');

const COUNTED: OpeningsDataset = {
  collections: [
    encyclopaedia([SICILIAN, OPEN_SICILIAN, POLISH]),
    { id: 'book', source: LICHESS, openings: [BY_ANOTHER_ROAD] },
  ],
};

const SOURCE: VendoredGames = {
  database: 'lichess_db_standard_rated',
  month: '2026-10',
  url: 'https://database.lichess.org/standard/lichess_db_standard_rated_2026-10.pgn.zst',
  license: 'CC0-1.0',
  retrieved: '2026-11-13',
  games: 5,
  counted: 4,
  leftOut: { correspondence: 0, unfinished: 1, unrated: 0, abandoned: 0, bot: 0, unreadable: 0 },
  depth: 3,
};

/** Four games counted for the positions of `COUNTED`, at more than one speed and strength. */
function tallies(): GameTallies {
  const { positions, depth } = positionsOfInterest(COUNTED);
  const tally = countGames(
    [
      game('1. e4 c5 2. Nf3', { white: 1700, black: 1300 }),
      game('1. Nf3 c5 2. e4', { result: '0-1', event: 'Rated Bullet game', white: 2450 }),
      game('1. e4 c5 2. d4', { result: '1/2-1/2' }),
      game('1. d4', { result: '0-1' }),
      game('1. e4', { result: '*' }),
    ].join(''),
    positions,
    depth,
  );
  return { source: SOURCE, positions, tally };
}

describe('buildStatistics', () => {
  it('says which month was counted, how many of its games, and under what licence', () => {
    expect(buildStatistics(COUNTED, tallies()).source).toEqual({
      title: 'lichess.org open database',
      url: 'https://database.lichess.org/',
      month: '2026-10',
      games: 4,
      license: 'CC0-1.0',
    });
  });

  it('adds up, for each position, the games of every speed and strength', () => {
    const { positions } = buildStatistics(COUNTED, tallies());

    // Every game, then 1. e4 c5, then 1. e4 c5 2. Nf3 by either road, then 1. b4.
    expect(positions.map(([white, draws, black]) => [white, draws, black])).toEqual([
      [1, 1, 2],
      [1, 1, 0],
      [1, 0, 1],
      [0, 0, 0],
    ]);
  });

  it('keeps what the ratings said White would score, to the nearest game', () => {
    const { positions } = buildStatistics(COUNTED, tallies());

    // 0.91 for the stronger player with White, 0.5 for the level games, 0.99 for the master.
    expect(positions.map(([, , , expected]) => expected)).toEqual([3, 1, 2, 0]);
  });

  it('says where each line of each collection ends, in the collection’s order', () => {
    expect(buildStatistics(COUNTED, tallies()).lines).toEqual({ eco: [1, 2, 3], book: [2] });
  });

  it('gives lines that end in the same position the same one', () => {
    const { lines } = buildStatistics(COUNTED, tallies());

    expect(lines.book?.[0]).toBe(lines.eco?.[1]);
  });

  it('has no position for a line that was not in the catalog when the games were counted', () => {
    const since: OpeningsDataset = {
      collections: [encyclopaedia([SICILIAN, opening('B00', 'Owen Defense', 'e4 b6'), POLISH])],
    };

    expect(buildStatistics(since, tallies()).lines).toEqual({ eco: [1, -1, 3] });
  });
});

describe('the statistics of the vendored games', () => {
  const { source, positions, lines } = realStatistics;
  const games = ([white, draws, black]: number[]) =>
    (white as number) + (draws as number) + (black as number);
  const total = games(positions[0] as number[]);

  it('are of October 2026’s 94 million counted games', () => {
    expect(source).toMatchObject({ month: '2026-10', games: 94_074_706, license: 'CC0-1.0' });
    expect(total).toBe(source.games);
  });

  it('have a position for every line of every collection', () => {
    for (const { id, openings } of realDataset.collections) {
      expect(lines[id]).toHaveLength(openings.length);
      expect(
        lines[id]?.filter((position) => !(position > 0 && position < positions.length)),
      ).toEqual([]);
    }
  });

  it('find the Sicilian in 9.2% of games', () => {
    const [encyclopaedia] = realDataset.collections;
    const sicilian = encyclopaedia?.openings.findIndex(({ id }) => id === 'sicilian-defense') ?? -1;
    const position = positions[lines.eco?.[sicilian] ?? -1] as number[];

    expect(games(position) / total).toBeCloseTo(0.092, 3);
  });

  it('are small enough to send with every visit', () => {
    expect(JSON.stringify(realStatistics).length).toBeLessThan(200_000);
  });
});
