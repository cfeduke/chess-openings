import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataSource, OpeningCollection, OpeningsDataset } from '../../src/data/opening.ts';
import { buildOpenings } from './build.ts';
import { parseOpeningsTsv } from './parse-tsv.ts';

/** Where the vendored data is kept, one directory to a source. */
export const DATA_DIR = join(import.meta.dirname, '../../data');

/** The directory of lichess's data within a data directory. */
const LICHESS = 'lichess';

/** The vendored lichess data. */
export const LICHESS_DATA_DIR = join(DATA_DIR, LICHESS);

/** One file per ECO volume. */
export const VOLUME_FILES = ['a.tsv', 'b.tsv', 'c.tsv', 'd.tsv', 'e.tsv'];

/** The file that pins the vendored data to an upstream commit. */
export const SOURCE_FILE = 'SOURCE.json';

/** What the lichess `SOURCE_FILE` holds. */
export interface VendoredSource {
  repository: string;
  commit: string;
  license: string;
  /** The day the data was downloaded, `YYYY-MM-DD`. */
  retrieved: string;
}

function readLichessSource(dataDir: string): DataSource {
  const file = join(LICHESS, SOURCE_FILE);
  const { repository, commit, license } = JSON.parse(readFileSync(join(dataDir, file), 'utf8'));
  for (const [field, value] of Object.entries({ repository, commit, license })) {
    if (typeof value !== 'string' || !value) throw new Error(`${file}: missing "${field}"`);
  }
  return {
    title: repository,
    url: `https://github.com/${repository}/tree/${commit}`,
    revision: commit.slice(0, 7),
    license,
  };
}

/** The encyclopaedia: lichess's named lines, each with its ECO code. */
function loadEncyclopaedia(dataDir: string): OpeningCollection {
  const source = readLichessSource(dataDir);
  const rows = VOLUME_FILES.flatMap((file) =>
    parseOpeningsTsv(readFileSync(join(dataDir, LICHESS, file), 'utf8'), file),
  );
  return { id: 'eco', source, openings: buildOpenings(rows) };
}

/** Reads the vendored data in `dataDir` and builds the dataset the site ships. */
export function loadDataset(dataDir: string): OpeningsDataset {
  return { collections: [loadEncyclopaedia(dataDir)] };
}
