import { join } from 'node:path';
import { buildStatistics } from '../../scripts/games/statistics.ts';
import { GAMES_DIR, readGameTallies } from '../../scripts/games/vendored.ts';
import { DATA_DIR } from '../../scripts/openings/dataset.ts';
import { realDataset } from './real-openings.ts';

/** The vendored tallies of lichess's games. */
export const realTallies = readGameTallies(join(DATA_DIR, GAMES_DIR));

/** What `npm run data` ships of them. */
export const realStatistics = buildStatistics(realDataset, realTallies);
