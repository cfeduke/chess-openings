import { join } from 'node:path';
import type { OpeningsDataset } from '../../src/data/opening.ts';
import { LICHESS_DIR, loadEncyclopaedia } from './lichess.ts';

/** Where the vendored data is kept, one directory to a source. */
export const DATA_DIR = join(import.meta.dirname, '../../data');

/** Reads the vendored data in `dataDir` and builds the dataset the site ships. */
export function loadDataset(dataDir: string): OpeningsDataset {
  return { collections: [loadEncyclopaedia(join(dataDir, LICHESS_DIR))] };
}
