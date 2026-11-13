import { describe, expect, it } from 'vitest';
import { foldText, foldWords } from './fold.ts';

describe('foldText', () => {
  it.each([
    ['Grünfeld Defense', 'grunfeld defense'],
    ['Réti Opening', 'reti opening'],
    ['Møller Defense', 'moller defense'],
    ['Čech–Matanović', 'cech–matanovic'],
  ])('folds %j to %j', (text, folded) => {
    expect(foldText(text)).toBe(folded);
  });

  it('keeps letters it cannot fold instead of failing, so it is safe on anything a user types', () => {
    expect(foldText('Łódź')).toBe('łodz');
  });
});

describe('foldWords', () => {
  it('splits folded text into its words, dropping punctuation', () => {
    expect(foldWords('Sicilian Defense: Najdorf Variation, English Attack')).toEqual([
      'sicilian',
      'defense',
      'najdorf',
      'variation',
      'english',
      'attack',
    ]);
    expect(foldWords('Caro-Kann Defense')).toEqual(['caro', 'kann', 'defense']);
  });

  it('keeps a possessive as one word', () => {
    expect(foldWords("King's Gambit")).toEqual(['kings', 'gambit']);
  });

  it('finds no words in punctuation or nothing', () => {
    expect(foldWords(' .. — ')).toEqual([]);
    expect(foldWords('')).toEqual([]);
  });
});
