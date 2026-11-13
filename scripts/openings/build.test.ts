import { describe, expect, it } from 'vitest';
import { buildOpenings } from './build.ts';

describe('buildOpenings', () => {
  it('replays the PGN into SAN and UCI move lists', () => {
    const [italian] = buildOpenings([{ eco: 'C50', name: 'Italian Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4' }]);

    expect(italian).toEqual({
      id: 'italian-game',
      eco: 'C50',
      name: 'Italian Game',
      san: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
      uci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
    });
  });

  it('writes castling as the king move in UCI', () => {
    const [line] = buildOpenings([
      { eco: 'C50', name: 'Italian Game: Castled', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O' },
    ]);

    expect(line?.san.at(-1)).toBe('O-O');
    expect(line?.uci.at(-1)).toBe('e1g1');
  });

  it('fails loudly on an illegal move, naming the opening and the move', () => {
    expect(() => buildOpenings([{ eco: 'C20', name: 'Bongcloud Gone Wrong', pgn: '1. e4 e5 2. Ke3' }])).toThrow(
      /Bongcloud Gone Wrong.*move 3 \(Ke3\)/,
    );
  });

  it('rejects SAN that is not in canonical form', () => {
    expect(() => buildOpenings([{ eco: 'A04', name: 'Overspecified', pgn: '1. Ng1f3' }])).toThrow(
      /Overspecified.*move 1 \(Ng1f3\)/,
    );
  });

  it('keeps the input order', () => {
    const names = buildOpenings([
      { eco: 'B00', name: 'Zebra', pgn: '1. e4' },
      { eco: 'A00', name: 'Aardvark', pgn: '1. d4' },
    ]).map((opening) => opening.name);

    expect(names).toEqual(['Zebra', 'Aardvark']);
  });

  describe('ids', () => {
    it('gives the shortest line of a repeated name the plain slug and numbers the rest in order', () => {
      const ids = buildOpenings([
        { eco: 'A06', name: 'Nimzo-Larsen Attack: Classical Variation', pgn: '1. Nf3 d5 2. b3' },
        { eco: 'A01', name: 'Nimzo-Larsen Attack: Classical Variation', pgn: '1. b3 d5' },
        { eco: 'A01', name: 'Nimzo-Larsen Attack: Classical Variation', pgn: '1. b3 d5 2. Bb2 c5 3. e3' },
      ]).map((opening) => opening.id);

      expect(ids).toEqual([
        'nimzo-larsen-attack-classical-variation-2',
        'nimzo-larsen-attack-classical-variation',
        'nimzo-larsen-attack-classical-variation-3',
      ]);
    });

    it('refuses to emit two openings with the same id', () => {
      expect(() =>
        buildOpenings([
          { eco: 'A00', name: 'Foo', pgn: '1. e4' },
          { eco: 'A00', name: 'Foo', pgn: '1. d4' },
          { eco: 'A00', name: 'Foo 2', pgn: '1. c4' },
        ]),
      ).toThrow(/duplicate id "foo-2"/);
    });
  });
});
