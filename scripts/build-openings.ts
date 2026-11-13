// Generates the dataset the site ships: `node scripts/build-openings.ts`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { DATA_DIR, loadDataset } from './openings/dataset.ts';

const OUTPUT = join(import.meta.dirname, '../public/openings.json');

const dataset = loadDataset(DATA_DIR);
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(dataset));

console.log(`${relative(process.cwd(), OUTPUT)}:`);
for (const { id, source, openings } of dataset.collections) {
  console.log(`  ${id}: ${openings.length} openings from ${source.title} @ ${source.revision}`);
}
