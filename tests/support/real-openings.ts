import { LICHESS_DATA_DIR, loadDataset } from '../../scripts/openings/dataset.ts';

/** The vendored lichess data, built the way `npm run data` builds it. */
export const realDataset = loadDataset(LICHESS_DATA_DIR);

/** Every opening in the vendored lichess data. */
export const realOpenings = realDataset.openings;
