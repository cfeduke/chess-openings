// Generates the data the site ships: `node scripts/build-openings.ts`.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { buildDetail } from './games/detail.ts';
import { buildStatistics } from './games/statistics.ts';
import { GAMES_DIR, readGameTallies } from './games/vendored.ts';
import { DATA_DIR, loadDataset } from './openings/dataset.ts';

const OUTPUT_DIR = join(import.meta.dirname, '../public');

/** Writes `data` as the file called `name`, and says where it went. */
function write(name: string, data: unknown): void {
  const file = join(OUTPUT_DIR, name);
  writeFileSync(file, JSON.stringify(data));
  console.log(`${relative(process.cwd(), file)}:`);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

const dataset = loadDataset(DATA_DIR);
write('openings.json', dataset);
for (const { id, source, openings } of dataset.collections) {
  console.log(`  ${id}: ${openings.length} openings from ${source.title} @ ${source.revision}`);
}

const tallies = readGameTallies(join(DATA_DIR, GAMES_DIR));
const statistics = buildStatistics(dataset, tallies);
write('statistics.json', statistics);
console.log(
  `  ${statistics.positions.length} positions, counted in ${statistics.source.games} games ` +
    `of ${statistics.source.month} from the ${statistics.source.title}`,
);

// The detail of each position, a file to every few hundred: none is left over from a build
// that had more of them.
const DETAIL_DIR = 'statistics';
rmSync(join(OUTPUT_DIR, DETAIL_DIR), { recursive: true, force: true });
mkdirSync(join(OUTPUT_DIR, DETAIL_DIR));
const chunks = buildDetail(dataset, tallies);
for (const [number, chunk] of chunks.entries()) {
  writeFileSync(join(OUTPUT_DIR, DETAIL_DIR, `${number}.json`), JSON.stringify(chunk));
}
console.log(`${relative(process.cwd(), join(OUTPUT_DIR, DETAIL_DIR))}/: ${chunks.length} files`);
