import { describe, expect, it } from 'vitest';
import { realOpenings, realWikibooks } from '../../tests/support/real-openings.ts';
import { createSearch } from './search.ts';

const search = createSearch(realOpenings);
const names = (query: string, limit?: number) =>
  search(query, limit).matches.map((opening) => opening.name);

describe('searching by name', () => {
  it('finds nothing for an empty or blank query', () => {
    expect(search('')).toEqual({ matches: [], total: 0 });
    expect(search('   ')).toEqual({ matches: [], total: 0 });
  });

  it('puts the most general line first', () => {
    expect(names('sicilian')[0]).toBe('Sicilian Defense');
    expect(names('najdorf')[0]).toBe('Sicilian Defense: Najdorf Variation');
  });

  it('matches every word of the query, as word prefixes, in any order', () => {
    const results = names('eng attack naj');

    expect(results[0]).toBe('Sicilian Defense: Najdorf Variation, English Attack');
    for (const name of results) expect(name).toMatch(/Najdorf.*English Attack/);
  });

  it('ignores case, accents and punctuation', () => {
    expect(names('GRUNFELD')[0]).toBe('Grünfeld Defense');
    expect(names('reti')[0]).toBe('Réti Opening');
    expect(names('kings gambit')[0]).toBe("King's Gambit");
    expect(names("king's gambit")[0]).toBe("King's Gambit");
    expect(names('caro kann')[0]).toBe('Caro-Kann Defense');
  });

  it('does not match in the middle of a word', () => {
    expect(names('ilian')).toEqual([]);
  });

  it('caps the matches at the limit but reports the full total', () => {
    const result = search('sicilian', 10);

    expect(result.matches).toHaveLength(10);
    expect(result.total).toBeGreaterThan(300);
  });
});

describe('searching by ECO code', () => {
  it('lists the lines filed under an exact code', () => {
    const result = search('B90');

    expect(result.total).toBe(realOpenings.filter((opening) => opening.eco === 'B90').length);
    expect(result.matches.every((opening) => opening.eco === 'B90')).toBe(true);
  });

  it('accepts lower case', () => {
    expect(search('b90')).toEqual(search('B90'));
  });

  it('combines with words', () => {
    expect(names('c50 pianissimo').every((name) => name.includes('Pianissimo'))).toBe(true);
    expect(search('c50 pianissimo').total).toBeGreaterThan(0);
    expect(search('b90 pianissimo').total).toBe(0);
  });
});

describe('searching by moves', () => {
  it('finds the lines that start with the moves, shortest first', () => {
    const result = search('1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6');

    expect(result.matches[0]?.name).toBe('Sicilian Defense: Najdorf Variation');
    expect(result.matches.every((opening) => opening.san.slice(0, 2).join(' ') === 'e4 c5')).toBe(
      true,
    );
    expect(result.total).toBeGreaterThan(10);
  });

  it('does not need move numbers, capitals or check marks', () => {
    expect(names('e4 e5 nf3 nc6 bb5')[0]).toBe('Ruy Lopez');
    expect(names('1.d4 Nf6 2.c4 e6 3.Nf3 Bb4')[0]).toBe('Bogo-Indian Defense');
  });

  it('understands castling written with zeros', () => {
    const result = search('e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 0-0');

    expect(result.total).toBeGreaterThan(0);
    expect(result.matches.every((opening) => opening.san[8] === 'O-O')).toBe(true);
  });

  it('reads a square as a move, not as part of an ECO code', () => {
    expect(names('b4')[0]).toBe('Polish Opening');
  });

  it('narrows by ECO code and by name as well', () => {
    const najdorfByMoves = realOpenings.filter(
      (opening) => opening.eco === 'B90' && opening.uci[1] === 'c7c5',
    );
    expect(search('b90 e4 c5').total).toBe(najdorfByMoves.length);

    const named = names('e4 c5 naj');
    expect(named[0]).toBe('Sicilian Defense: Najdorf Variation');
    expect(named.every((name) => name.includes('Najdorf'))).toBe(true);
  });

  it('finds nothing in a query that is only a move number', () => {
    expect(search('1.')).toEqual({ matches: [], total: 0 });
  });

  it('finds nothing for a move order no line uses', () => {
    expect(search('a4 a5 h4 h5 Ra3 Ra6')).toEqual({ matches: [], total: 0 });
  });
});

describe('searching a collection in which many lines share a name', () => {
  const book = createSearch(realWikibooks, { namesNest: false });
  const first = (query: string) => book(query).matches[0];

  it('puts the shortest line first, which is where the opening starts', () => {
    expect(first('ruy lopez')).toMatchObject({
      name: 'Ruy López / Spanish game',
      san: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    });
    expect(first('sicilian')?.san).toEqual(['e4', 'c5']);
    expect(first('caro kann')?.san).toEqual(['e4', 'c6']);
  });

  it('puts the shorter name first among lines of a length', () => {
    const search = createSearch(
      [
        { id: 'b', eco: 'C50', name: 'Italian Game, the quiet one', san: ['e4', 'e5'], uci: [] },
        { id: 'a', eco: 'C50', name: 'Italian Game', san: ['e4', 'e5'], uci: [] },
        { id: 'c', eco: 'C50', name: 'Italian', san: ['e4', 'e5', 'Nf3'], uci: [] },
      ],
      { namesNest: false },
    );

    expect(search('italian').matches.map((opening) => opening.id)).toEqual(['a', 'b', 'c']);
  });

  it('finds lines by ECO code and by moves, as in any collection', () => {
    expect(book('C60').total).toBeGreaterThan(10);
    expect(first('e4 e5 nf3 nc6 bb5')?.name).toBe('Ruy López / Spanish game');
  });
});
