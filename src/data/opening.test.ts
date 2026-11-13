import { describe, expect, it } from 'vitest';
import { type DataSource, decodeOpenings, encodeOpenings, type Opening } from './opening.ts';

const source: DataSource = {
  repository: 'lichess-org/chess-openings',
  commit: 'abc123',
  license: 'CC0-1.0',
};

const italian: Opening = {
  id: 'italian-game',
  eco: 'C50',
  name: 'Italian Game',
  san: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
  uci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
};

describe('openings wire format', () => {
  it('packs each opening into a compact tuple with space-joined moves', () => {
    const payload = encodeOpenings(source, [italian]);

    expect(payload).toEqual({
      source,
      openings: [
        ['italian-game', 'C50', 'Italian Game', 'e4 e5 Nf3 Nc6 Bc4', 'e2e4 e7e5 g1f3 b8c6 f1c4'],
      ],
    });
  });

  it('round-trips through JSON', () => {
    const amar: Opening = { id: 'amar-opening', eco: 'A00', name: 'Amar Opening', san: ['Nh3'], uci: ['g1h3'] };

    const wire = JSON.parse(JSON.stringify(encodeOpenings(source, [italian, amar])));

    expect(decodeOpenings(wire)).toEqual([italian, amar]);
  });
});
