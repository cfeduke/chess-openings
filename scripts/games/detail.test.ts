import { describe, expect, it } from 'vitest';
import type { OpeningsDataset } from '../../src/data/opening.ts';
import { countGames, lichessGame as game } from '../../tests/support/games.ts';
import { encyclopaedia, LICHESS, opening } from '../../tests/support/openings.ts';
import { realDataset } from '../../tests/support/real-openings.ts';
import { realStatistics, realTallies } from '../../tests/support/real-statistics.ts';
import { buildDetail, DETAIL_CHUNK, detailIndex } from './detail.ts';
import { positionsOfInterest } from './interest.ts';
import type { GameTallies, VendoredGames } from './vendored.ts';

const KINGS_PAWN = opening('B00', "King's Pawn Game", 'e4');
const SICILIAN = opening('B20', 'Sicilian Defense', 'e4 c5');
const OPEN_SICILIAN = opening('B27', 'Sicilian Defense: Open', 'e4 c5 Nf3');
const BY_ANOTHER_ROAD = opening('A04', 'Zukertort Opening: Sicilian Invitation', 'Nf3 c5 e4');

const DATASET: OpeningsDataset = {
  collections: [
    encyclopaedia([KINGS_PAWN, SICILIAN, OPEN_SICILIAN]),
    { id: 'book', source: LICHESS, openings: [BY_ANOTHER_ROAD] },
  ],
};

const GAMES = [
  // Twenty moves each side, and no more: a short game.
  game(`1. e4 c5 2. Nf3 ${'Nc6 3. Ng1 Nb8 4. Nf3 '.repeat(9)}Nc6`, { white: 1000, black: 1000 }),
  game('1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4', { white: 1000, black: 1000, result: '0-1' }),
  game('1. e4 c5 2. Nc3', { white: 2500, black: 2500, result: '1/2-1/2' }),
  game('1. e4 e5', { event: 'Rated Bullet game', white: 2500, black: 2500 }),
  game('1. Nf3 c5 2. e4', { event: 'Rated Classical game' }),
];

function tallies(dataset = DATASET): GameTallies {
  const { positions, depth } = positionsOfInterest(dataset);
  return {
    source: {} as VendoredGames,
    positions,
    tally: countGames(GAMES.join(''), positions, depth),
  };
}

describe('detailIndex', () => {
  it('says how the detail is cut up, and how all the games fall into each band and speed', () => {
    expect(detailIndex(tallies().tally)).toEqual({
      size: DETAIL_CHUNK,
      bands: [0, 1200, 1600, 2000, 2400],
      speeds: ['bullet', 'blitz', 'rapid', 'classical'],
      totals: {
        bands: [
          [1, 0, 1],
          [1, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
          [1, 1, 0],
        ],
        speeds: [
          [1, 0, 0],
          [1, 1, 1],
          [0, 0, 0],
          [1, 0, 0],
        ],
      },
    });
  });
});

describe('buildDetail', () => {
  // The places: every game's start, 1. e4, 1. e4 c5, and 1. e4 c5 2. Nf3 by either road.
  const [chunk] = buildDetail(DATASET, tallies());
  const [start, kingsPawn, sicilian, open] = chunk ?? [];

  it('is a file for every so many positions, each holding its positions in order', () => {
    expect(buildDetail(DATASET, tallies())).toHaveLength(1);
    expect(chunk).toHaveLength(4);
  });

  it('says how the games that reached a position went, band by band', () => {
    expect(sicilian?.bands).toEqual([
      [1, 0, 1],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
    ]);
  });

  it('and speed by speed', () => {
    expect(start?.speeds).toEqual([
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
      [1, 0, 0],
    ]);
  });

  it('lists the moves played next, the most played first, with the games each was played in', () => {
    expect(start?.moves.map(([san, games]) => [san, games])).toEqual([
      ['e4', 4],
      ['Nf3', 1],
    ]);
    expect(sicilian?.moves.map(([san, games]) => [san, games])).toEqual([
      ['Nf3', 2],
      ['Nc3', 1],
    ]);
  });

  it('says which position each of those moves leads to, where it is one that was counted', () => {
    expect(start?.moves.map(([, , to]) => to)).toEqual([1, -1]);
    expect(kingsPawn?.moves).toEqual([
      ['c5', 3, 2],
      ['e5', 1, -1],
    ]);
    expect(sicilian?.moves.map(([, , to]) => to)).toEqual([3, -1]);
  });

  it('finds the position a move leads to however the line came to its own', () => {
    // 1. Nf3 c5 2. e4 and 1. e4 c5 2. Nf3 are one position, from which ...d6 and ...Nc6 lead on.
    expect(open?.moves.map(([san, , to]) => [san, to])).toEqual([
      ['Nc6', -1],
      ['d6', -1],
    ]);
  });

  it('adds up how long the games were, and how many were over within twenty moves', () => {
    expect(sicilian).toMatchObject({ plies: 40 + 7 + 3, short: 3 });
    expect(start).toMatchObject({ plies: 40 + 7 + 3 + 2 + 3, short: 5 });
  });

  it('says nothing of the moves from a position no line of the catalog ends in any more', () => {
    const fewer: OpeningsDataset = { collections: [encyclopaedia([KINGS_PAWN, OPEN_SICILIAN])] };
    const [stale] = buildDetail(fewer, tallies());

    // The Sicilian was counted, but the catalog no longer has a line to reach it by.
    expect(stale?.[2]?.moves).toEqual([
      ['Nf3', 2, -1],
      ['Nc3', 1, -1],
    ]);
    expect(stale?.[1]?.moves[0]).toEqual(['c5', 3, 2]);
  });
});

describe('the detail of the vendored games', () => {
  const chunks = buildDetail(realDataset, realTallies);

  it('is cut into files of 256 positions, small enough to fetch for one opening', () => {
    expect(DETAIL_CHUNK).toBe(256);
    expect(chunks).toHaveLength(Math.ceil(realStatistics.positions.length / 256));
    expect(chunks.flat()).toHaveLength(realStatistics.positions.length);
    for (const chunk of chunks) expect(JSON.stringify(chunk).length).toBeLessThan(200_000);
  });

  it('agrees with the numbers that are sent at a glance', () => {
    const sum = (outcomes: number[][]) =>
      outcomes.flat().reduce((total, count) => total + count, 0);

    for (const place of [0, 1, 500, 5000]) {
      const [white, draws, black] = realStatistics.positions[place] ?? [];
      const detail = chunks.flat()[place];
      expect(sum(detail?.bands ?? [])).toBe((white ?? 0) + (draws ?? 0) + (black ?? 0));
      expect(sum(detail?.speeds ?? [])).toBe(sum(detail?.bands ?? []));
    }
  });

  it('is indexed in the statistics that are sent with the page', () => {
    expect(realStatistics.detail).toEqual(detailIndex(realTallies.tally));
    expect(realStatistics.detail?.totals.bands.flat().reduce((sum, n) => sum + n, 0)).toBe(
      realStatistics.source.games,
    );
  });

  it('leads from the Sicilian to its lines: 2. Nf3 first, to a position that was counted', () => {
    const sicilian = realDataset.collections[0]?.openings.findIndex(
      ({ id }) => id === 'sicilian-defense',
    );
    const place = realStatistics.lines.eco?.[sicilian ?? -1] ?? -1;
    const [san, games, to] = chunks.flat()[place]?.moves[0] ?? [];

    expect(san).toBe('Nf3');
    expect(games).toBeGreaterThan(3_000_000);
    expect(realStatistics.lines.eco).toContain(to);
  });
});
