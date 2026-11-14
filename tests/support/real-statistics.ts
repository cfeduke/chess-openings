import { join } from 'node:path';
import { buildStatistics } from '../../scripts/games/statistics.ts';
import { GAMES_DIR, readGameTallies } from '../../scripts/games/vendored.ts';
import { DATA_DIR } from '../../scripts/openings/dataset.ts';
import { realDataset } from './real-openings.ts';

/** What `npm run data` ships of the vendored tallies of lichess's games. */
export const realStatistics = buildStatistics(
  realDataset,
  readGameTallies(join(DATA_DIR, GAMES_DIR)),
);
