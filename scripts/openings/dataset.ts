import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataSource, OpeningsDataset } from '../../src/data/opening.ts';
import { buildOpenings } from './build.ts';
import { parseOpeningsTsv } from './parse-tsv.ts';

/** The vendored upstream data. */
export const LICHESS_DATA_DIR = join(import.meta.dirname, '../../data/lichess');

/** One file per ECO volume. */
export const VOLUME_FILES = ['a.tsv', 'b.tsv', 'c.tsv', 'd.tsv', 'e.tsv'];

/** The file that pins the vendored data to an upstream commit. */
export const SOURCE_FILE = 'SOURCE.json';

/** What `SOURCE_FILE` holds. */
export interface VendoredSource extends DataSource {
  /** The day the data was downloaded, `YYYY-MM-DD`. */
  retrieved: string;
}

function readSource(dataDir: string): DataSource {
  const { repository, commit, license } = JSON.parse(
    readFileSync(join(dataDir, SOURCE_FILE), 'utf8'),
  );
  const source = { repository, commit, license };
  for (const [field, value] of Object.entries(source)) {
    if (typeof value !== 'string' || !value) throw new Error(`${SOURCE_FILE}: missing "${field}"`);
  }
  return source;
}

/** Reads the vendored TSVs in `dataDir` and builds the dataset the site ships. */
export function loadDataset(dataDir: string): OpeningsDataset {
  const source = readSource(dataDir);
  const rows = VOLUME_FILES.flatMap((file) =>
    parseOpeningsTsv(readFileSync(join(dataDir, file), 'utf8'), file),
  );
  return { source, openings: buildOpenings(rows) };
}
