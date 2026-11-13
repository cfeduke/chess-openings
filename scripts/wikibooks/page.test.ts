import { describe, expect, it } from 'vitest';
import { movesOfTitle, nameOfPage } from './page.ts';

describe('movesOfTitle', () => {
  it('reads the moves of a line out of the title of its page', () => {
    expect(movesOfTitle('Chess Opening Theory/1. e4/1...e5/2. Nf3/2...Nc6/3. Bb5')).toEqual([
      'e4',
      'e5',
      'Nf3',
      'Nc6',
      'Bb5',
    ]);
    expect(movesOfTitle('Chess Opening Theory/1. Nf3')).toEqual(['Nf3']);
  });

  it('takes the moves as they are written, checks and castling included', () => {
    expect(movesOfTitle('Chess Opening Theory/1. e4/1...e5/2. Qh5/2...Ke7/3. Qxe5#')).toEqual([
      'e4',
      'e5',
      'Qh5',
      'Ke7',
      'Qxe5#',
    ]);
  });

  it.each([
    'Chess Opening Theory',
    'Chess Opening Theory/Local manual of style',
    'Chess Opening Theory/ECO volume A',
    'Chess Opening Theory/1. e4/Notes',
    'Chess/1. e4',
  ])('finds none in %j, which is not the page of a line', (title) => {
    expect(movesOfTitle(title)).toBeNull();
  });

  it.each([
    'Chess Opening Theory/1...e5',
    'Chess Opening Theory/1. e4/2...e5',
    'Chess Opening Theory/1. e4/1. e5',
    'Chess Opening Theory/2. e4',
  ])('finds none in %j, whose moves are not numbered in turn', (title) => {
    expect(movesOfTitle(title)).toBeNull();
  });
});

describe('nameOfPage', () => {
  const position = (parameters: string, rest = '') =>
    `{{Chess Opening Theory/Position\n${parameters}\n}}\n${rest}`;

  describe('from the template that heads a page', () => {
    it('is the first parameter', () => {
      const page = position(
        "|Ruy López / Spanish game\n|eco=[[Chess/ECOC|C60—99]]\n|parent=[[../|King's Knight Opening]]\n" +
          "|responses=<br>\n* [[/3...a6|3...a6 · Morphy's defence]]",
        '== 3. Bb5 · Ruy López or Spanish game ==',
      );

      expect(nameOfPage(page)).toBe('Ruy López / Spanish game');
    });

    it('is the parameter called name, wherever it comes', () => {
      const page = position(
        '|moves=1. Nf3\n|name=Zukertort Opening\n|eco=[[Chess/ECOA|A04-A09]]',
        '== 1. Nf3 · Zukertort opening ==',
      );

      expect(nameOfPage(page)).toBe('Zukertort Opening');
    });

    it('is found in the older form of the template, which draws the board', () => {
      const page =
        '__NOTOC__\n\n{{Chess Opening Theory/Position|=\n|Réti Opening|\n' +
        '   |rd|nd|bd|qd|kd|bd|nd|rd|=\n   |pd|pd|  |pd|pd|pd|pd|pd|=\n||\n}}\n=Sicilian Invitation=';

      expect(nameOfPage(page)).toBe('Réti Opening');
    });

    it('is tidied: one space between words, none around it', () => {
      expect(nameOfPage(position('|  Nakhmanson  Gambit '))).toBe('Nakhmanson Gambit');
    });

    it('is not taken from a parameter that is a number of the board', () => {
      expect(nameOfPage(position('|17=pd\n|35=pl'))).toBe('');
    });

    it.each(['|1. Nf3', '|1...b5?', '|[[Ruy Lopez]]', "|''Italian'' Game", '|'])(
      'is not %j, which is no name: the heading is tried instead',
      (parameters) => {
        expect(nameOfPage(position(parameters, '== 2. c4 · Réti opening =='))).toBe('Réti opening');
      },
    );

    it('is preferred to the heading', () => {
      expect(nameOfPage(position('|Italian game', '== 3. Bc4 · Giuoco =='))).toBe('Italian game');
    });
  });

  describe('from the first heading, for a page without the template', () => {
    it.each([
      ['== 1...d5 · Scandinavian defence ==', 'Scandinavian defence'],
      ['== 4. c3 · Caro-Kann - Botvinnik-Carls Defence ==', 'Caro-Kann - Botvinnik-Carls Defence'],
      ['== 2. Nf3 - Reversed Alekhine ==', 'Reversed Alekhine'],
      ['== Ke3?? — Mana Attack ==', 'Mana Attack'],
      ['= Rybasov Gambit =', 'Rybasov Gambit'],
      ['===Evans Gambit Declined: Lange Variation===', 'Evans Gambit Declined: Lange Variation'],
      ['== Queen’s Gambit  Declined ==', 'Queen’s Gambit Declined'],
    ])('reads %j as %j', (heading, name) => {
      expect(nameOfPage(`Some words first.\n\n${heading}\nAnd the theory.`)).toBe(name);
    });

    it.each([
      '== 5...Bf5 ==',
      '== Nxe5 ==',
      '== 3...f6? ==',
      "== '''3...f5''' ==",
      '== Theory table ==',
      '== References ==',
      '== London System Main Line with ...d5 ==',
      '== The Breyer Gambit - 3. Qf3?! ==',
      '==  ==',
    ])('does not take %j for a name', (heading) => {
      expect(nameOfPage(`${heading}\nSome theory.`)).toBe('');
    });

    it('looks no further than the first heading', () => {
      expect(nameOfPage('== 4. Nf3 ==\nTheory.\n== Elephant Gambit ==\nMore.')).toBe('');
    });
  });

  it('is empty for a page that names nothing', () => {
    expect(nameOfPage("'''Rb1?? - Twyble Attack'''\n\nThis does nothing.\n\n{{BookCat}}")).toBe('');
    expect(nameOfPage('')).toBe('');
  });
});
