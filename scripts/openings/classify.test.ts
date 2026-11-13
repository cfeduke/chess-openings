import { describe, expect, it } from 'vitest';
import { realOpenings } from '../../tests/support/real-openings.ts';
import { buildOpenings } from './build.ts';
import { ecoClassifier } from './classify.ts';
import { createReplayer } from './replay.ts';

describe('ecoClassifier', () => {
  const replay = createReplayer();
  const named = buildOpenings(
    [
      { eco: 'C20', name: "King's Pawn Game", pgn: '1. e4 e5' },
      { eco: 'C40', name: "King's Knight Opening", pgn: '1. e4 e5 2. Nf3' },
      { eco: 'C50', name: 'Italian Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4' },
      { eco: 'B00', name: "King's Pawn", pgn: '1. e4' },
    ],
    replay,
  );
  const ecoOf = ecoClassifier(named, replay);
  const codeOf = (pgn: string) => ecoOf(replay('a line', pgn).positions);

  it('gives a named line its own code', () => {
    expect(codeOf('1. e4 e5 2. Nf3 Nc6 3. Bc4')).toBe('C50');
    expect(codeOf('1. e4')).toBe('B00');
  });

  it('gives any other line the code of the last named position it passes through', () => {
    expect(codeOf('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3')).toBe('C50');
    expect(codeOf('1. e4 e5 2. Nf3 Nc6')).toBe('C40');
    expect(codeOf('1. e4 c5')).toBe('B00');
  });

  it('knows a named position however it was reached', () => {
    expect(codeOf('1. e4 e5 2. Bc4 Nc6 3. Nf3')).toBe('C50');
    expect(codeOf('1. Nf3 e5 2. e4')).toBe('C40');
  });

  it('refuses a line that never reaches a named position', () => {
    expect(() => codeOf('1. d4 d5')).toThrow(/no named position/);
  });

  it('files the lichess lines themselves where lichess files them', () => {
    const real = createReplayer();
    const ecoOfReal = ecoClassifier(realOpenings, real);
    const moved = realOpenings.filter(
      ({ eco, name, san }) => ecoOfReal(real(name, san.join(' ')).positions) !== eco,
    );

    // A few positions are named twice by lichess, under two codes: the first to name one keeps it.
    expect(moved.length).toBeLessThan(realOpenings.length / 100);
  });
});
