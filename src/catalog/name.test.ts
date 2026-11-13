import { describe, expect, it } from 'vitest';
import { parseOpeningName } from './name.ts';

describe('parseOpeningName', () => {
  it('splits "Family: Variation, Subvariation" at the colon', () => {
    expect(parseOpeningName('Sicilian Defense: Najdorf Variation, English Attack')).toEqual({
      family: 'Sicilian Defense',
      variation: 'Najdorf Variation, English Attack',
    });
  });

  it('treats a bare family name as its main line', () => {
    expect(parseOpeningName('Zukertort Opening')).toEqual({
      family: 'Zukertort Opening',
      variation: '',
    });
  });

  it('files "Family, with …" names under the family', () => {
    expect(parseOpeningName("King's Indian Attack, with Bf5")).toEqual({
      family: "King's Indian Attack",
      variation: 'with Bf5',
    });
    expect(parseOpeningName("Queen's Indian Defense, with e3: Dreev Variation")).toEqual({
      family: "Queen's Indian Defense",
      variation: 'with e3: Dreev Variation',
    });
  });

  it('only splits once, keeping later colons and commas in the variation', () => {
    expect(parseOpeningName("English Opening: King's English Variation, with .. d6, Be7")).toEqual({
      family: 'English Opening',
      variation: "King's English Variation, with .. d6, Be7",
    });
  });
});
