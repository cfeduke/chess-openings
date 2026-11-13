import type {
  DataSource,
  Opening,
  OpeningCollection,
  OpeningsDataset,
} from '../../src/data/opening.ts';
import { slugify } from '../../src/text/slug.ts';
import { ITALIAN_GAME } from './lines.ts';

/** An opening for a test: its id is the slug of its name, and its moves need not be playable. */
export function opening(eco: string, name: string, san: string, uci = ''): Opening {
  return { id: slugify(name), eco, name, san: san.split(' '), uci: uci ? uci.split(' ') : [] };
}

const NAJDORF_SAN = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6';
const NAJDORF_UCI = 'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6';

/** The Italian Game and the Najdorf can be played through; the rest are there to be browsed. */
export const ITALIAN: Opening = {
  id: 'italian-game',
  eco: 'C50',
  name: 'Italian Game',
  ...ITALIAN_GAME,
};
export const NAJDORF = opening(
  'B90',
  'Sicilian Defense: Najdorf Variation',
  NAJDORF_SAN,
  NAJDORF_UCI,
);

/** A handful of openings spread over the volumes: enough to browse, small enough to read. */
export const SMALL_BOOK: Opening[] = [
  opening('A00', 'Polish Opening', 'b4'),
  opening('B01', 'Scandinavian Defense', 'e4 d5'),
  opening('B20', 'Sicilian Defense', 'e4 c5'),
  NAJDORF,
  opening('B90', 'Sicilian Defense: Najdorf Variation, English Attack', `${NAJDORF_SAN} Be3`),
  ITALIAN,
  opening('C50', 'Italian Game: Giuoco Pianissimo', 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3'),
  opening('C50', 'Four Knights Game: Italian Variation', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Nc3'),
  opening('D10', 'Slav Defense', 'd4 d5 c4 c6'),
];

/** Where the encyclopaedia's lines come from. */
export const LICHESS: DataSource = {
  title: 'lichess-org/chess-openings',
  url: 'https://github.com/lichess-org/chess-openings/tree/abc1234def',
  revision: 'abc1234',
  license: 'CC0-1.0',
};

/** The encyclopaedia's collection, holding `openings`. */
export const encyclopaedia = (openings: Opening[]): OpeningCollection => ({
  id: 'eco',
  source: LICHESS,
  openings,
});

export const SMALL_DATASET: OpeningsDataset = { collections: [encyclopaedia(SMALL_BOOK)] };
