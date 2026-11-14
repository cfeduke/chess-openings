import { describe, expect, it } from 'vitest';
import type { Opening } from '../../src/data/opening.ts';
import { countGames, lichessGame as game } from '../../tests/support/games.ts';
import { encyclopaedia, opening } from '../../tests/support/openings.ts';
import { realOpenings } from '../../tests/support/real-openings.ts';
import { realStatistics, realTallies } from '../../tests/support/real-statistics.ts';
import { positionsOfInterest } from './interest.ts';
import { mainLines, rankableFamilies } from './most-played.ts';
import type { GameTallies, VendoredGames } from './vendored.ts';

const KINGS_PAWN = opening('B00', "King's Pawn Game", 'e4');
const SICILIAN = opening('B20', 'Sicilian Defense', 'e4 c5');
const NAJDORF = opening('B90', 'Sicilian Defense: Najdorf Variation', 'e4 c5 Nf3 d6');
const FRENCH = opening('C00', 'French Defense', 'e4 e6');
const POLISH = opening('A00', 'Polish Opening', 'b4');
const QUEENS_PAWN = opening('A40', "Queen's Pawn Game", 'd4');
const QUEENS_GAMBIT = opening('D06', "Queen's Gambit", 'd4 d5 c4');
const DECLINED = opening('D30', "Queen's Gambit Declined", 'd4 d5 c4 e6');

/** The tallies of `games` for the lines of `openings`. */
function counted(openings: Opening[], games: string[]): GameTallies {
  const { positions, depth } = positionsOfInterest({ collections: [encyclopaedia(openings)] });
  return {
    source: {} as VendoredGames,
    positions,
    tally: countGames(games.join(''), positions, depth),
  };
}

const times = (count: number, moves: string, options = {}) =>
  Array.from({ length: count }, () => game(moves, options));

const ranked = (openings: Opening[], games: string[]) =>
  rankableFamilies(openings, counted(openings, games)).map((family) => family.opening);

describe('mainLines', () => {
  it('are the lines named for a family alone', () => {
    expect(mainLines([KINGS_PAWN, SICILIAN, NAJDORF, FRENCH])).toEqual([
      KINGS_PAWN,
      SICILIAN,
      FRENCH,
    ]);
  });

  it('are the shortest of them, where transpositions repeat the name', () => {
    const byAnotherRoad = { ...opening('B20', 'Sicilian Defense', 'Nf3 c5 e4'), id: 'sicilian-2' };

    expect(mainLines([byAnotherRoad, SICILIAN])).toEqual([SICILIAN]);
    expect(mainLines([SICILIAN, byAnotherRoad])).toEqual([SICILIAN]);
  });

  it('leave out a family that has only variations', () => {
    expect(mainLines([NAJDORF, POLISH])).toEqual([POLISH]);
  });
});

describe('rankableFamilies', () => {
  const E4 = [KINGS_PAWN, SICILIAN, NAJDORF, FRENCH, POLISH];
  const E4_GAMES = [
    ...times(5, '1. e4 c5'),
    ...times(3, '1. e4 e6'),
    ...times(1, '1. e4 e5'),
    ...times(2, '1. b4'),
  ];

  it('are the families with a main line, the most played first', () => {
    expect(ranked(E4, E4_GAMES)).toEqual(['sicilian-defense', 'french-defense', 'polish-opening']);
  });

  it('leave out a family most of whose games go on into other families', () => {
    // Eight of the nine games that began 1. e4 became a Sicilian or a French.
    expect(ranked(E4, E4_GAMES)).not.toContain('kings-pawn-game');
  });

  it('keep a family half of whose games stay its own', () => {
    const games = [...times(2, '1. e4 c5'), ...times(2, '1. e4 e5')];

    expect(ranked(E4, games)).toEqual(['kings-pawn-game', 'sicilian-defense']);
  });

  it('do not count a game again for each family it goes on through', () => {
    const openings = [QUEENS_PAWN, QUEENS_GAMBIT, DECLINED];
    const games = [...times(3, '1. d4 d5 2. c4 e6'), ...times(1, '1. d4 d5 2. c4 dxc4')];

    // The Queen's Gambit is a way in: three of its four games are Declined. But of the eight
    // games that began 1. d4, only those four went on, though they went on through two families.
    expect(ranked(openings, [...games, ...times(4, '1. d4 Nf6')])).toEqual([
      'queens-pawn-game',
      'queens-gambit-declined',
    ]);
  });

  it('count a game for a family however it came to it', () => {
    const games = [...times(2, '1. e4 c5'), ...times(3, '1. c4 e5 2. e4 c5')];

    expect(ranked([SICILIAN, FRENCH], games)).toEqual(['sicilian-defense', 'french-defense']);
    expect(ranked([SICILIAN, POLISH], [...games, ...times(1, '1. b4')])).toEqual([
      'sicilian-defense',
      'polish-opening',
    ]);
  });

  it('say how the games of each family went, band by band', () => {
    const games = [
      ...times(2, '1. e4 c5', { white: 1000, black: 1000 }),
      ...times(1, '1. e4 c5', { white: 1000, black: 1000, result: '0-1' }),
      ...times(1, '1. e4 c5', { white: 2500, black: 2500, result: '1/2-1/2' }),
      ...times(1, '1. e4 c5', { white: 2500, black: 2500, event: 'Rated Bullet game' }),
    ];

    expect(rankableFamilies([SICILIAN], counted([SICILIAN], games))).toEqual([
      {
        opening: 'sicilian-defense',
        counts: [
          [2, 0, 1],
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
          [1, 1, 0],
        ],
      },
    ]);
  });

  it('leave out a family that was not in the catalog when the games were counted', () => {
    const tallies = counted([SICILIAN], times(2, '1. e4 c5'));

    expect(rankableFamilies([SICILIAN, FRENCH], tallies).map((family) => family.opening)).toEqual([
      'sicilian-defense',
    ]);
  });
});

describe('the families of the encyclopaedia, by the vendored games', () => {
  const families = rankableFamilies(realOpenings, realTallies);
  const names = new Map(realOpenings.map(({ id, name }) => [id, name]));

  it('are 126 with a line of their own, of which eight are ways into others', () => {
    const mains = mainLines(realOpenings);
    const kept = new Set(families.map((family) => family.opening));

    expect(mains).toHaveLength(126);
    expect(
      mains
        .filter(({ id }) => !kept.has(id))
        .map(({ name }) => name)
        .sort(),
    ).toEqual([
      'Benko Gambit',
      'Center Game',
      'Danish Gambit',
      "King's Knight Opening",
      "King's Pawn Game",
      "Queen's Gambit",
      "Queen's Pawn Game",
      'Three Knights Opening',
    ]);
  });

  it('begin with the Sicilian, the Scandinavian and the French', () => {
    expect(families.slice(0, 8).map((family) => names.get(family.opening))).toEqual([
      'Sicilian Defense',
      'Scandinavian Defense',
      'French Defense',
      'Caro-Kann Defense',
      'Indian Defense',
      'Italian Game',
      'Zukertort Opening',
      'English Opening',
    ]);
  });

  it('are shipped with the statistics, as the encyclopaedia’s, with the totals of each band', () => {
    const { mostPlayed, source } = realStatistics;
    const games = mostPlayed?.totals.flat().reduce((sum, count) => sum + count, 0);

    expect(mostPlayed?.collection).toBe('eco');
    expect(mostPlayed?.bands).toEqual([0, 1200, 1600, 2000, 2400]);
    expect(games).toBe(source.games);
    expect(mostPlayed?.families).toEqual(families);
  });
});
