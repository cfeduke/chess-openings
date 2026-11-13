import { describe, expect, it } from 'vitest';
import { slugify } from './slug.ts';

describe('slugify', () => {
  it.each([
    [
      'Sicilian Defense: Najdorf Variation, English Attack',
      'sicilian-defense-najdorf-variation-english-attack',
    ],
    ["King's Indian Attack, with Bf5", 'kings-indian-attack-with-bf5'],
    ["Queen's Indian Defense, with e3, Bb4+ Line", 'queens-indian-defense-with-e3-bb4-line'],
    [
      'English Opening: Fianchetto Line, with .. d6, Be7',
      'english-opening-fianchetto-line-with-d6-be7',
    ],
    ['Grünfeld Defense', 'grunfeld-defense'],
    ['Réti Opening', 'reti-opening'],
    ['Kádas Opening', 'kadas-opening'],
    ['Ruy Lopez: Møller Defense', 'ruy-lopez-moller-defense'],
    ['Döry Defense', 'dory-defense'],
    ['Čech Variation: Matanović Attack', 'cech-variation-matanovic-attack'],
  ])('turns %j into %j', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it('refuses to silently drop a letter it cannot transliterate', () => {
    expect(() => slugify('Łódź Gambit')).toThrow(/cannot transliterate "ł" in "Łódź Gambit"/);
  });

  it('never produces leading, trailing or doubled dashes', () => {
    expect(slugify('  -- St. George Defense --  ')).toBe('st-george-defense');
  });
});
