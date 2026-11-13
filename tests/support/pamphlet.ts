import { ARRANGEMENTS } from '../../src/catalog/arrangements.ts';
import type { Arrangement } from '../../src/catalog/catalog.ts';
import type { Opening, OpeningCollection, OpeningsDataset } from '../../src/data/opening.ts';
import { slugify } from '../../src/text/slug.ts';
import { encyclopaedia, SMALL_BOOK } from './openings.ts';

const gambit = (eco: string, name: string, san: string, uci = ''): Opening => ({
  id: `pamphlet-${slugify(name)}`,
  eco,
  name,
  san: san.split(' '),
  uci: uci ? uci.split(' ') : [],
});

/** The Danish Gambit can be played through; the rest are there to be browsed. */
export const DANISH = gambit(
  'C21',
  'Danish Gambit',
  'e4 e5 d4 exd4 c3',
  'e2e4 e7e5 d2d4 e5d4 c2c3',
);
export const BUDAPEST = gambit('A51', 'Budapest Gambit', 'd4 Nf6 c4 e5');

/**
 * A second collection, nothing like the encyclopaedia: a pamphlet of gambits, with a source of
 * its own to credit.
 */
export const PAMPHLET: OpeningCollection = {
  id: 'pamphlet',
  source: {
    title: 'A Pamphlet of Gambits',
    url: 'https://example.org/pamphlet',
    revision: '2nd edition',
    license: 'CC-BY-4.0',
  },
  openings: [
    DANISH,
    gambit('C40', 'Latvian Gambit', 'e4 e5 Nf3 f5'),
    gambit('C51', 'Evans Gambit', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4'),
    BUDAPEST,
  ],
};

const CHAPTERS = [
  { first: 'e4', title: 'King’s Pawn Gambits' },
  { first: 'd4', title: 'Queen’s Pawn Gambits' },
  { first: 'c4', title: 'Flank Gambits' },
];

/**
 * How the pamphlet is laid out: a chapter for each pawn White opens with, holding one group that
 * has no codes, in which every gambit is a family of its own.
 */
export const PAMPHLET_ARRANGEMENT: Arrangement = {
  name: 'Pamphlet',
  title: 'A Pamphlet of Gambits',
  sectionsLabel: 'Pamphlet chapters',
  arrange: (openings) =>
    CHAPTERS.map(({ first, title }) => {
      const gambits = openings.filter((opening) => opening.san[0] === first);
      return {
        id: first,
        tab: `1. ${first}`,
        name: `Chapter 1. ${first}`,
        title,
        summary: `Pawns given up after 1. ${first}.`,
        groups:
          gambits.length === 0
            ? []
            : [
                {
                  id: `pamphlet-${first}`,
                  codes: '',
                  title: `Gambits after 1. ${first}`,
                  moves: [first],
                  families: gambits.map((opening) => ({
                    name: opening.name,
                    lines: [{ opening, family: opening.name, variation: '' }],
                  })),
                },
              ],
      };
    }),
};

/** The encyclopaedia and the pamphlet, side by side. */
export const TWO_COLLECTIONS: OpeningsDataset = {
  collections: [encyclopaedia(SMALL_BOOK), PAMPHLET],
};

/** What arranges them. */
export const TWO_ARRANGEMENTS = { ...ARRANGEMENTS, pamphlet: PAMPHLET_ARRANGEMENT };
