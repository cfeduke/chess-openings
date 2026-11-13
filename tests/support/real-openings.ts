import { LICHESS_DATA_DIR, loadDataset } from '../../scripts/openings/dataset.ts';
import type { Opening } from '../../src/data/opening.ts';

/** Every opening in the vendored lichess data, built the way `npm run data` builds it. */
export const realOpenings: Opening[] = loadDataset(LICHESS_DATA_DIR).openings;
