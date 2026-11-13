import { describe, expect, it } from 'vitest';
import { buildOpenings } from './build.ts';

describe('buildOpenings', () => {
  it('replays the PGN into SAN and UCI move lists', () => {
    const [italian] = buildOpenings([
      { eco: 'C50', name: 'Italian Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4' },
    ]);

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
    expect(() =>
      buildOpenings([{ eco: 'C20', name: 'Bongcloud Gone Wrong', pgn: '1. e4 e5 2. Ke3' }]),
    ).toThrow(/Bongcloud Gone Wrong.*move 3 \(Ke3\)/);
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

  it('keeps the engine error as the cause of an illegal-move failure', () => {
    const attempt = () =>
      buildOpenings([{ eco: 'C20', name: 'Bongcloud Gone Wrong', pgn: '1. e4 e5 2. Ke3' }]);

    expect(attempt).toThrow(expect.objectContaining({ cause: expect.any(Error) }));
  });

  it('replays lines that share a prefix independently of their order', () => {
    const rows = [
      { eco: 'C50', name: 'Italian Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4' },
      { eco: 'C60', name: 'Ruy Lopez', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5' },
      { eco: 'C44', name: "King's Knight Opening", pgn: '1. e4 e5 2. Nf3 Nc6' },
    ];

    const forwards = buildOpenings(rows);
    const backwards = buildOpenings(rows.toReversed()).toReversed();

    expect(forwards).toEqual(backwards);
    expect(forwards.map((opening) => opening.uci.join(' '))).toEqual([
      'e2e4 e7e5 g1f3 b8c6 f1c4',
      'e2e4 e7e5 g1f3 b8c6 f1b5',
      'e2e4 e7e5 g1f3 b8c6',
    ]);
  });

  describe('ids', () => {
    // Upstream repeats a name once per transposition.
    const viaNf3 = {
      eco: 'A06',
      name: 'Nimzo-Larsen Attack: Classical Variation',
      pgn: '1. Nf3 d5 2. b3',
    };
    const shortest = {
      eco: 'A01',
      name: 'Nimzo-Larsen Attack: Classical Variation',
      pgn: '1. b3 d5',
    };
    const longer = {
      eco: 'A01',
      name: 'Nimzo-Larsen Attack: Classical Variation',
      pgn: '1. b3 d5 2. Bb2 c5 3. e3',
    };
    const ids = (rows: (typeof shortest)[]) => buildOpenings(rows).map((opening) => opening.id);

    it('gives the shortest line of a repeated name the plain slug', () => {
      expect(ids([viaNf3, shortest, longer])[1]).toBe('nimzo-larsen-attack-classical-variation');
    });

    it('marks every other line with a fingerprint of its own moves', () => {
      const [first, , third] = ids([viaNf3, shortest, longer]);

      expect(first).toMatch(/^nimzo-larsen-attack-classical-variation-[0-9a-f]{6}$/);
      expect(third).toMatch(/^nimzo-larsen-attack-classical-variation-[0-9a-f]{6}$/);
      expect(first).not.toBe(third);
    });

    it('does not change existing ids when upstream adds another transposition', () => {
      expect(ids([longer, viaNf3, shortest]).slice(1)).toEqual(ids([viaNf3, shortest]));
    });

    it('refuses to emit two openings with the same id', () => {
      expect(() => ids([shortest, longer, longer])).toThrow(
        /duplicate id "nimzo-larsen-attack-classical-variation-[0-9a-f]{6}"/,
      );
    });
  });
});
