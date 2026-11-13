// Generates the dataset the site ships: `node scripts/build-openings.ts`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { LICHESS_DATA_DIR, loadDataset } from './openings/dataset.ts';

const OUTPUT = 'public/openings.json';

const payload = loadDataset(LICHESS_DATA_DIR);
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(payload));
console.log(
  `${OUTPUT}: ${payload.openings.length} openings from ${payload.source.repository}@${payload.source.commit.slice(0, 7)}`,
);
