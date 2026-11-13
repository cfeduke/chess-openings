import { describe, expect, it } from 'vitest';
import type { Opening, OpeningsDataset } from '../../src/data/opening.ts';
import { realDataset } from '../../tests/support/real-openings.ts';
import { createReplayer } from '../openings/replay.ts';
import { positionsOfInterest } from './interest.ts';
import { createGame } from './play.ts';

const replay = createReplayer();
const positionAfter = (pgn: string) => replay('a line', pgn).positions.at(-1);

const line = (id: string, ...san: string[]): Opening => ({
  id,
  eco: 'A00',
  name: id,
  san,
  uci: [],
});
const source = { title: 'a source', url: 'https://example.org', revision: '1', license: 'CC0-1.0' };

const DATASET: OpeningsDataset = {
  collections: [
    { id: 'eco', source, openings: [line('kp', 'e4'), line('kn', 'e4', 'e5', 'Nf3')] },
    { id: 'book', source, openings: [line('reti', 'Nf3', 'e5', 'e4'), line('qp', 'd4')] },
  ],
};

describe('positionsOfInterest', () => {
  it('are where every game begins, then where each line of each collection ends', () => {
    expect(positionsOfInterest(DATASET).positions).toEqual([
      createGame().position(),
      positionAfter('1. e4'),
      positionAfter('1. e4 e5 2. Nf3'),
      positionAfter('1. d4'),
    ]);
  });

  it('are to be looked for as deep as the longest line goes', () => {
    expect(positionsOfInterest(DATASET).depth).toBe(3);
  });

  it('take in the whole catalog, each position once', () => {
    const openings = realDataset.collections.flatMap((collection) => collection.openings);
    const { positions, depth } = positionsOfInterest(realDataset);

    expect(new Set(positions).size).toBe(positions.length);
    expect(positions.length).toBeGreaterThan(5000);
    expect(positions.length).toBeLessThanOrEqual(openings.length + 1);
    expect(depth).toBe(Math.max(...openings.map((opening) => opening.san.length)));
  });
});
