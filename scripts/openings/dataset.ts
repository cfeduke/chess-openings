import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type DataSource, encodeOpenings, type OpeningsPayload } from '../../src/data/opening.ts';
import { buildOpenings } from './build.ts';
import { parseOpeningsTsv } from './parse-tsv.ts';

/** The vendored upstream data, relative to the repository root. */
export const LICHESS_DATA_DIR = 'data/lichess';

/** One file per ECO volume. */
export const VOLUME_FILES = ['a.tsv', 'b.tsv', 'c.tsv', 'd.tsv', 'e.tsv'];

/** The file that pins the vendored data to an upstream commit. */
export const SOURCE_FILE = 'SOURCE.json';

/** Reads the vendored TSVs in `dataDir` and builds the payload the site ships. */
export function loadDataset(dataDir: string): OpeningsPayload {
  const rows = VOLUME_FILES.flatMap((file) =>
    parseOpeningsTsv(readFileSync(join(dataDir, file), 'utf8'), file),
  );
  const { repository, commit, license }: DataSource = JSON.parse(
    readFileSync(join(dataDir, SOURCE_FILE), 'utf8'),
  );
  return encodeOpenings({ repository, commit, license }, buildOpenings(rows));
}
