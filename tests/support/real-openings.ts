import { DATA_DIR, loadDataset } from '../../scripts/openings/dataset.ts';
import type { Opening } from '../../src/data/opening.ts';

/** The vendored data, built the way `npm run data` builds it. */
export const realDataset = loadDataset(DATA_DIR);

const openingsOf = (id: string): Opening[] => {
  const collection = realDataset.collections.find((candidate) => candidate.id === id);
  if (!collection) throw new Error(`the dataset has no "${id}" collection`);
  return collection.openings;
};

/** Every opening in the vendored lichess data: the encyclopaedia's collection. */
export const realOpenings = openingsOf('eco');

/** Every line of Wikibooks' Chess Opening Theory, as vendored. */
export const realWikibooks = openingsOf('wikibooks');
