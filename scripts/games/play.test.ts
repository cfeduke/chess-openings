import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { parseMoveText } from '../../src/chess/san.ts';
import { realDataset } from '../../tests/support/real-openings.ts';
import { createReplayer, positionOf } from '../openings/replay.ts';
import { createGame } from './play.ts';

/** The position after each move of `san`, as the rules engine has it. */
function byTheRules(san: string[]): string[] {
  const game = new Chess();
  return san.map((move) => positionOf(game.move(move, { strict: true }).after));
}

/** The position after each move of `san`, as a game played without the rules has it. */
function played(san: string[]): string[] {
  const game = createGame();
  return san.map((move) => {
    game.play(move);
    return game.position();
  });
}

const positionAfter = (pgn: string) => played(parseMoveText(pgn)).at(-1);

/** A source of numbers that gives the same ones every time. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A legal game of up to `plies` moves chosen by chance, half the time from the pawn moves alone:
 * pawns that keep going are what make captures in passing and promotions.
 */
function gameOfChance(seed: number, plies: number): string[] {
  const random = seeded(seed);
  const game = new Chess();
  const san: string[] = [];
  while (san.length < plies && !game.isGameOver()) {
    const legal = game.moves();
    const pawns = legal.filter((move) => /^[a-h]/.test(move));
    const from = pawns.length > 0 && random() < 0.5 ? pawns : legal;
    const move = from[Math.floor(random() * from.length)] as string;
    game.move(move);
    san.push(move);
  }
  return san;
}

describe('a game played without the rules', () => {
  it('begins where every game does', () => {
    expect(createGame().position()).toBe(positionOf(new Chess().fen()));
  });

  it('reaches the positions the rules engine does, on every line of the catalog', () => {
    const replay = createReplayer();
    const wrong = realDataset.collections
      .flatMap((collection) => collection.openings)
      .filter(({ name, san }) => {
        const { positions } = replay(name, san.join(' '));
        return played(san).join('\n') !== positions.join('\n');
      });

    expect(wrong.map((opening) => opening.id)).toEqual([]);
  });

  it.each([
    ['a capture in passing', '1. e4 a6 2. e5 d5 3. exd6'],
    ['a capture in passing by Black', '1. a3 e5 2. a4 e4 3. d4 exd3'],
    ['a pawn that promotes by capturing', '1. a4 b5 2. axb5 a6 3. bxa6 Nc6 4. a7 Rb8 5. axb8=Q'],
    ['a pawn that becomes a knight', '1. h4 g5 2. hxg5 h6 3. gxh6 Nf6 4. h7 Rg8 5. h8=N'],
    [
      'castling short and long',
      '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 d6 6. Nc3 Bg4 7. Be3 Qd7 8. Qd2 O-O-O',
    ],
    ['castling long and short', '1. d4 d5 2. Nc3 Nf6 3. Bg5 e6 4. Qd2 Be7 5. O-O-O O-O'],
    ['a move that says which file it is from', '1. Nf3 Nf6 2. Nc3 Nc6 3. Nd4 Nd5 4. Ndb5'],
    [
      'a move that says which rank it is from',
      '1. Nc3 a6 2. Na4 a5 3. Nc5 a4 4. e3 h6 5. Ne2 h5 6. Nc3 h4 7. N3e4',
    ],
    ['checks', '1. e4 f5 2. Qh5+ g6 3. Qxg6+ hxg6'],
    ['mate', '1. f3 e5 2. g4 Qh4#'],
  ])('plays %s', (_what, pgn) => {
    const san = parseMoveText(pgn);

    expect(played(san)).toEqual(byTheRules(san));
  });

  it('knows which of two pieces is meant when the other is pinned, though the move does not say', () => {
    // Either knight could go to e2, but the one on c3 shields the king from the bishop on b4.
    const san = parseMoveText('1. d4 e6 2. Nc3 Bb4 3. e3 Nf6 4. Ne2');

    expect(played(san)).toEqual(byTheRules(san));
    expect(played(san).at(-1)).toMatch(/^rnbqk2r\/pppp1ppp\/4pn2\/8\/1b1P4\/2N1P3\/PPP1NPPP\//);
  });

  it('takes away the right to castle with a rook that has been captured where it stood', () => {
    expect(positionAfter('1. b3 g6 2. Bb2 Bg7 3. Bxg7 Nf6 4. Bxh8')).toMatch(/ b KQq$/);
  });

  it('takes away the right to castle with a rook that has moved, though it comes back', () => {
    expect(positionAfter('1. h4 h5 2. Rh3 Rh6 3. Rh1 Rh8')).toMatch(/ w Qq$/);
  });

  it('takes away both rights of a king that has moved, though it comes back', () => {
    expect(positionAfter('1. e4 e5 2. Ke2 Ke7 3. Ke1 Ke8')).toMatch(/ w -$/);
  });

  it('agrees with the rules engine move for move through whole games of chance', () => {
    const games = Array.from({ length: 60 }, (_, seed) => gameOfChance(seed + 1, 200));
    const moves = games.flat();

    // The games are only worth playing if they hold what the opening lines do not.
    expect(moves.filter((move) => move.includes('=')).length).toBeGreaterThan(10);
    expect(moves.filter((move) => /^[QRBN][a-h1-8]x?[a-h][1-8]/.test(move)).length).toBeGreaterThan(
      10,
    );
    expect(moves.filter((move) => move.startsWith('O-O')).length).toBeGreaterThan(0);

    const wrong = games.filter((san) => played(san).join('\n') !== byTheRules(san).join('\n'));
    expect(wrong.map((san) => san.join(' '))).toEqual([]);
  });

  it('refuses a move that no piece can make', () => {
    expect(() => createGame().play('Nf6')).toThrow(/Nf6/);
    expect(() => createGame().play('exd5')).toThrow(/exd5/);
    expect(() => createGame().play('O-O')).toThrow(/O-O/);
  });
});
