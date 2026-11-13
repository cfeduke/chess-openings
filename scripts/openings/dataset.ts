import { join } from 'node:path';
import type { OpeningsDataset } from '../../src/data/opening.ts';
import { ecoClassifier } from './classify.ts';
import { LICHESS_DIR, loadEncyclopaedia } from './lichess.ts';
import { createReplayer } from './replay.ts';
import { loadWikibooks, WIKIBOOKS_DIR } from './wikibooks.ts';

/** Where the vendored data is kept, one directory to a source. */
export const DATA_DIR = join(import.meta.dirname, '../../data');

/**
 * Reads the vendored data in `dataDir` and builds the dataset the site ships: the encyclopaedia
 * first, then the books, whose lines are filed under ECO codes by the encyclopaedia's.
 */
export function loadDataset(dataDir: string): OpeningsDataset {
  const replay = createReplayer();
  const encyclopaedia = loadEncyclopaedia(join(dataDir, LICHESS_DIR), replay);
  const ecoOf = ecoClassifier(encyclopaedia.openings, replay);
  const collections = [encyclopaedia, loadWikibooks(join(dataDir, WIKIBOOKS_DIR), replay, ecoOf)];

  // An id is an address on the site, whichever collection the opening is in.
  const ids = new Set<string>();
  for (const { id } of collections.flatMap((collection) => collection.openings)) {
    if (ids.has(id)) throw new Error(`two openings have the id ${JSON.stringify(id)}`);
    ids.add(id);
  }
  return { collections };
}
