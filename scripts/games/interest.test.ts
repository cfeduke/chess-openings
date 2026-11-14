import { describe, expect, it } from 'vitest';
import type { OpeningsDataset } from '../../src/data/opening.ts';
import { positionReachedBy, START } from '../../tests/support/games.ts';
import { encyclopaedia, LICHESS, opening } from '../../tests/support/openings.ts';
import { realDataset } from '../../tests/support/real-openings.ts';
import { positionsOfInterest } from './interest.ts';

const DATASET: OpeningsDataset = {
  collections: [
    encyclopaedia([
      opening('B00', "King's Pawn", 'e4'),
      opening('C40', "King's Knight Opening", 'e4 e5 Nf3'),
    ]),
    {
      id: 'book',
      source: LICHESS,
      openings: [
        opening('A04', 'Zukertort Opening', 'Nf3 e5 e4'),
        opening('A40', "Queen's Pawn", 'd4'),
      ],
    },
  ],
};

describe('positionsOfInterest', () => {
  it('are where every game begins, then where each line of each collection ends', () => {
    expect(positionsOfInterest(DATASET).positions).toEqual([
      START,
      positionReachedBy('1. e4'),
      positionReachedBy('1. e4 e5 2. Nf3'),
      positionReachedBy('1. d4'),
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
