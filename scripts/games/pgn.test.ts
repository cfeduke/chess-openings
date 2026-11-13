import { describe, expect, it } from 'vitest';
import { eachGame, movesOf, pliesOf, type Tags } from './pgn.ts';

/** Two games as lichess writes them: one with clocks, one without. */
const TWO_GAMES = `[Event "Rated Blitz game"]
[Site "https://lichess.org/game/Q8ku5wgM"]
[White "aila"]
[Black "GEIMIDEISH"]
[Result "1/2-1/2"]
[WhiteElo "1825"]
[BlackElo "1790"]
[Opening "Indian Defense: Wade-Tartakower Defense"]
[TimeControl "300+0"]
[Termination "Normal"]

1. d4 { [%clk 0:05:00] } 1... Nf6 { [%clk 0:05:00] } 2. Nf3 { [%clk 0:05:00] } 1/2-1/2

[Event "Rated Bullet tournament https://lichess.org/tournament/abc"]
[White "a \\"quoted\\" name"]
[Result "0-1"]

1. e4 e5 2. Qh5 Ke7 0-1

`;

function gamesOf(pgn: string) {
  const games: { tags: Tags; moveText: string }[] = [];
  eachGame(pgn, (tags, moveText) => games.push({ tags: { ...tags }, moveText }));
  return games;
}

describe('eachGame', () => {
  it('visits every game with its tags and its moves', () => {
    const [first, second, ...rest] = gamesOf(TWO_GAMES);

    expect(rest).toEqual([]);
    expect(first?.tags).toMatchObject({
      Event: 'Rated Blitz game',
      Result: '1/2-1/2',
      WhiteElo: '1825',
      BlackElo: '1790',
      Termination: 'Normal',
    });
    expect(first?.moveText).toContain('1. d4 { [%clk 0:05:00] } 1... Nf6');
    expect(second?.tags.Event).toBe('Rated Bullet tournament https://lichess.org/tournament/abc');
    expect(second?.moveText).toBe('1. e4 e5 2. Qh5 Ke7 0-1');
  });

  it('leaves a tag the game does not have undefined, whatever the game before had', () => {
    const [, second] = gamesOf(TWO_GAMES);

    expect(second?.tags.WhiteElo).toBeUndefined();
    expect(second?.tags.Termination).toBeUndefined();
  });

  it('reads a game that was over before a move was made', () => {
    const [game] = gamesOf('[Event "Rated Blitz game"]\n[Result "0-1"]\n\n0-1\n\n');

    expect(game?.moveText).toBe('0-1');
  });

  it('reads the last game though nothing follows it', () => {
    expect(gamesOf('[Result "1-0"]\n\n1. e4 1-0')).toEqual([
      { tags: { Result: '1-0' }, moveText: '1. e4 1-0' },
    ]);
  });

  it('finds no game in nothing', () => {
    expect(gamesOf('')).toEqual([]);
    expect(gamesOf('\n\n')).toEqual([]);
  });
});

describe('movesOf', () => {
  it('reads the moves and leaves out their numbers and the result', () => {
    expect(movesOf('1. e4 e5 2. Qh5 Ke7 0-1', 10)).toEqual(['e4', 'e5', 'Qh5', 'Ke7']);
    expect(movesOf('1. e4 e5 1/2-1/2', 10)).toEqual(['e4', 'e5']);
    expect(movesOf('1. e4 *', 10)).toEqual(['e4']);
  });

  it('leaves out what lichess says about a move: its clock, its evaluation, its verdict', () => {
    const moveText =
      '1. e4 { [%eval 0.17] [%clk 0:00:30] } 1... c5?! { [%eval 0.32] [%clk 0:00:30] } ' +
      '2. Nf3?? { [%clk 0:00:29] } 2... O-O-O+! $6 3. exd8=Q# 1-0';

    expect(movesOf(moveText, 10)).toEqual(['e4', 'c5', 'Nf3', 'O-O-O+', 'exd8=Q#']);
  });

  it('stops at the limit it is given', () => {
    expect(movesOf('1. e4 e5 2. Qh5 Ke7 0-1', 3)).toEqual(['e4', 'e5', 'Qh5']);
    expect(movesOf('1. e4 e5 2. Qh5 Ke7 0-1', 0)).toEqual([]);
  });

  it('finds no moves in a game that had none', () => {
    expect(movesOf('0-1', 10)).toEqual([]);
    expect(movesOf('', 10)).toEqual([]);
  });
});

describe('pliesOf', () => {
  it('counts the moves of both sides', () => {
    expect(pliesOf('1. e4 e5 2. Qh5 Ke7 0-1')).toBe(4);
    expect(pliesOf('1. e4 e5 2. Qh5 1-0')).toBe(3);
    expect(pliesOf('1. e4 *')).toBe(1);
  });

  it('counts them among clocks and evaluations', () => {
    expect(pliesOf('1. d4 { [%clk 0:05:00] } 1... Nf6 { [%clk 0:05:00] } 1/2-1/2')).toBe(2);
    expect(
      pliesOf('1. d4 { [%clk 0:05:00] } 1... Nf6 { [%clk 0:05:00] } 2. c4 { [%eval 0.2] } 1-0'),
    ).toBe(3);
  });

  it('counts a long game without reading all of it', () => {
    const moveText = `${Array.from({ length: 60 }, (_, i) => `${i + 1}. Nf3 { [%clk 0:01:00] } ${i + 1}... Nf6 { [%clk 0:01:00] }`).join(' ')} 61. Ng1 { [%clk 0:00:01] } 1-0`;

    expect(pliesOf(moveText)).toBe(121);
  });

  it('counts none in a game that had none', () => {
    expect(pliesOf('0-1')).toBe(0);
    expect(pliesOf('')).toBe(0);
  });
});
