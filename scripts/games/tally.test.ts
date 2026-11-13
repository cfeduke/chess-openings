import { describe, expect, it } from 'vitest';
import { createReplayer } from '../openings/replay.ts';
import { createGame } from './play.ts';
import {
  BANDS,
  countedGames,
  countsOf,
  createCounter,
  mergeTallies,
  movesFrom,
  SPEEDS,
  type Tally,
} from './tally.ts';

const replay = createReplayer();
const positionAfter = (pgn: string) => replay('a line', pgn).positions.at(-1) as string;

const START = createGame().position();
const E4 = positionAfter('1. e4');
const SICILIAN = positionAfter('1. e4 c5');
const NAJDORF = positionAfter('1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6');
const QUEENS_PAWN = positionAfter('1. d4 d5 2. Nf3');
const POSITIONS = [START, E4, SICILIAN, NAJDORF, QUEENS_PAWN];

interface GameOptions {
  event?: string;
  white?: number | '?';
  black?: number | '?';
  result?: string;
  tags?: Record<string, string>;
}

/** A game as lichess writes one. */
function game(moves: string, options: GameOptions = {}): string {
  const { event = 'Rated Blitz game', white = 1500, black = 1500, result = '1-0' } = options;
  const tags = {
    Event: event,
    Result: result,
    WhiteElo: String(white),
    BlackElo: String(black),
    Termination: 'Normal',
    ...options.tags,
  };
  const lines = Object.entries(tags).map(([name, value]) => `[${name} "${value}"]`);
  return `${lines.join('\n')}\n\n${moves} ${result}\n\n`;
}

/** The tally of `games`, read as deep as `depth`. */
function tallyOf(games: string[], depth = 40, positions = POSITIONS): Tally {
  const counter = createCounter(positions, depth);
  counter.count(games.join(''));
  return counter.tally;
}

/** How many games reached each position, whatever their speed and band. */
function reached(tally: Tally, positions = POSITIONS): number[] {
  return positions.map((_, position) =>
    SPEEDS.flatMap((speed) => BANDS.map((band) => countsOf(tally, position, speed, band))).reduce(
      (sum, { white, draws, black }) => sum + white + draws + black,
      0,
    ),
  );
}

const NAJDORF_GAME = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5';

describe('a tally of games', () => {
  it('counts a game for every position of interest it passes through', () => {
    const tally = tallyOf([game(NAJDORF_GAME), game('1. e4 e6 2. d4 d5')]);

    expect(reached(tally)).toEqual([2, 2, 1, 1, 0]);
    expect(tally.games).toBe(2);
    expect(countedGames(tally)).toBe(2);
  });

  it('counts a game for a position however the game got there', () => {
    const tally = tallyOf([game('1. Nf3 d5 2. d4 Nf6'), game('1. d4 d5 2. Nf3 e6')]);

    expect(reached(tally)[POSITIONS.indexOf(QUEENS_PAWN)]).toBe(2);
  });

  it('counts a game once for a position it comes back to', () => {
    const tally = tallyOf([game('1. Nf3 Nf6 2. Ng1 Ng8 3. e4 c5')]);

    expect(reached(tally)).toEqual([1, 1, 1, 0, 0]);
    expect(movesFrom(tally, 0)).toEqual([['Nf3', 1]]);
  });

  it('reads the moves through what lichess writes around them', () => {
    const tally = tallyOf([
      game(
        '1. e4 { [%eval 0.17] [%clk 0:05:00] } 1... c5?! { [%clk 0:05:00] } 2. Nf3 { [%clk 0:04:58] }',
      ),
    ]);

    expect(reached(tally)).toEqual([1, 1, 1, 0, 0]);
  });

  it('keeps apart games of different speeds, and counts ultrabullet as bullet', () => {
    const tally = tallyOf([
      game('1. e4', { event: 'Rated Bullet game' }),
      game('1. e4', { event: 'Rated UltraBullet game' }),
      game('1. e4', { event: 'Rated Blitz tournament https://lichess.org/tournament/x' }),
      game('1. e4', { event: 'Rated Rapid game' }),
      game('1. e4', { event: 'Rated Classical game' }),
    ]);
    const games = (speed: (typeof SPEEDS)[number]) => countsOf(tally, 1, speed, 1200).white;

    expect(SPEEDS.map(games)).toEqual([2, 1, 1, 1]);
  });

  it('keeps apart games of different strengths, going by the mean of the two ratings', () => {
    const tally = tallyOf([
      game('1. e4', { white: 800, black: 900 }),
      game('1. e4', { white: 1100, black: 1299 }),
      game('1. e4', { white: 1199, black: 1201 }),
      game('1. e4', { white: 1500, black: 1699 }),
      game('1. e4', { white: 1500, black: 1700 }),
      game('1. e4', { white: 2399, black: 2000 }),
      game('1. e4', { white: 2400, black: 2400 }),
      game('1. e4', { white: 3100, black: 2900 }),
    ]);

    expect(BANDS).toEqual([0, 1200, 1600, 2000, 2400]);
    expect(BANDS.map((band) => countsOf(tally, 1, 'blitz', band).white)).toEqual([2, 2, 1, 1, 2]);
  });

  it('counts who won', () => {
    const tally = tallyOf([
      game('1. e4', { result: '1-0' }),
      game('1. e4', { result: '1-0' }),
      game('1. e4', { result: '1/2-1/2' }),
      game('1. d4', { result: '0-1' }),
    ]);

    expect(countsOf(tally, 0, 'blitz', 1200)).toMatchObject({ white: 2, draws: 1, black: 1 });
    expect(countsOf(tally, 1, 'blitz', 1200)).toMatchObject({ white: 2, draws: 1, black: 0 });
  });

  it('adds up what the ratings said White would score', () => {
    const tally = tallyOf([
      game('1. e4', { white: 1500, black: 1500 }),
      game('1. e4', { white: 1700, black: 1300 }),
      game('1. d4', { white: 1300, black: 1700 }),
    ]);

    // A player 400 points the stronger is expected to score ten points in eleven.
    expect(countsOf(tally, 1, 'blitz', 1200).expected).toBeCloseTo(0.5 + 0.91, 5);
    expect(countsOf(tally, 0, 'blitz', 1200).expected).toBeCloseTo(0.5 + 0.91 + 0.09, 5);
  });

  it('adds up how long the games were, and counts those over within twenty moves', () => {
    const shuffle = (moves: number) =>
      Array.from({ length: moves }, (_, i) => `${i + 1}. ${i % 2 ? 'Ng1 Ng8' : 'Nf3 Nf6'}`).join(
        ' ',
      );
    const tally = tallyOf([
      game('1. e4 c5 2. Nf3'),
      game(shuffle(20)),
      game(`${shuffle(20)} 21. e4`),
    ]);

    expect(countsOf(tally, 0, 'blitz', 1200)).toMatchObject({ plies: 3 + 40 + 41, short: 2 });
    expect(countsOf(tally, 2, 'blitz', 1200)).toMatchObject({ plies: 3, short: 1 });
  });

  it('counts the moves that were played from a position, the most played first', () => {
    const tally = tallyOf([
      game('1. e4 e5'),
      game('1. d4 d5'),
      game('1. e4 c5 2. Nf3', { event: 'Rated Bullet game', white: 2500, black: 2500 }),
      game('1. e4 c5 2. Nc3'),
      game('1. e4'),
    ]);

    expect(movesFrom(tally, 0)).toEqual([
      ['e4', 4],
      ['d4', 1],
    ]);
    expect(movesFrom(tally, 1)).toEqual([
      ['c5', 2],
      ['e5', 1],
    ]);
    // Of moves played as often as each other, the one that comes first in the alphabet is first.
    expect(movesFrom(tally, 2)).toEqual([
      ['Nc3', 1],
      ['Nf3', 1],
    ]);
    expect(movesFrom(tally, 3)).toEqual([]);
  });

  it('reads a game no deeper than it is told to', () => {
    const tally = tallyOf([game(NAJDORF_GAME)], 2);

    // The Najdorf is ten moves in. The Sicilian is two, and the move played from it is the third.
    expect(reached(tally)).toEqual([1, 1, 1, 0, 0]);
    expect(movesFrom(tally, 2)).toEqual([['Nf3', 1]]);
    expect(countsOf(tally, 0, 'blitz', 1200).plies).toBe(12);
  });

  it.each([
    ['correspondence', game('1. e4', { event: 'Rated Correspondence game' })],
    ['unfinished', game('1. e4', { result: '*' })],
    ['unrated', game('1. e4', { white: '?' })],
    ['unrated', game('1. e4', { black: '?' })],
    ['abandoned', game('1. e4', { tags: { Termination: 'Abandoned' } })],
    ['abandoned', game('', { result: '0-1' })],
    ['bot', game('1. e4', { tags: { WhiteTitle: 'BOT' } })],
    ['bot', game('1. e4', { tags: { BlackTitle: 'BOT' } })],
    ['unreadable', game('1. e4 e5 2. Nf6')],
    ['unreadable', game('1. e4', { event: 'Rated Hyperbullet game' })],
  ] as const)('leaves out a game that is %s, and says so', (reason, left) => {
    const tally = tallyOf([game('1. e4 c5'), left, game('1. d4', { tags: { WhiteTitle: 'GM' } })]);

    expect(tally.games).toBe(3);
    expect(countedGames(tally)).toBe(2);
    expect(reached(tally)).toEqual([2, 1, 1, 0, 0]);
    expect(movesFrom(tally, 0)).toEqual([
      ['d4', 1],
      ['e4', 1],
    ]);
    expect(tally.leftOut).toMatchObject({ [reason]: 1 });
    expect(Object.values(tally.leftOut).reduce((sum, games) => sum + games)).toBe(1);
  });

  it('is the same whether the games are counted together or apart and added up', () => {
    const games = [
      game(NAJDORF_GAME, { result: '0-1', white: 2100, black: 2300 }),
      game('1. e4 e6 2. d4 d5', { event: 'Rated Rapid game' }),
      game('1. Nf3 d5 2. d4 Nf6', { result: '1/2-1/2' }),
      game('1. e4', { result: '*' }),
      game('1. e4 c5 2. Nc3', { event: 'Rated Bullet game', white: 900, black: 1000 }),
    ];
    const together = tallyOf(games);

    const apart = tallyOf(games.slice(0, 2));
    mergeTallies(apart, tallyOf(games.slice(2, 3)));
    mergeTallies(apart, tallyOf(games.slice(3)));

    expect(apart).toEqual(together);
    expect(reached(apart)).toEqual([4, 3, 2, 1, 1]);
  });

  it('refuses to add up tallies of different positions', () => {
    expect(() => mergeTallies(tallyOf([]), tallyOf([], 40, [START, E4]))).toThrow();
  });
});
