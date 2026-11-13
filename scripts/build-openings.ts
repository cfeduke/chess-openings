// Generates the dataset the site ships: `node scripts/build-openings.ts`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { LICHESS_DATA_DIR, loadDataset } from './openings/dataset.ts';

const OUTPUT = join(import.meta.dirname, '../public/openings.json');

const dataset = loadDataset(LICHESS_DATA_DIR);
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(dataset));

const { repository, commit } = dataset.source;
console.log(
  `${relative(process.cwd(), OUTPUT)}: ${dataset.openings.length} openings from ${repository}@${commit.slice(0, 7)}`,
);
