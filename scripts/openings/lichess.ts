import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { DataSource, OpeningCollection } from '../../src/data/opening.ts';
import { ECO_COLLECTION } from '../../src/eco/arrangement.ts';
import { buildOpenings } from './build.ts';
import { parseOpeningsTsv } from './parse-tsv.ts';

/** Where lichess's data is kept within the data directory. */
export const LICHESS_DIR = 'lichess';

/** One file per ECO volume. */
export const VOLUME_FILES = ['a.tsv', 'b.tsv', 'c.tsv', 'd.tsv', 'e.tsv'];

/** The file that pins the vendored data to an upstream commit. */
export const SOURCE_FILE = 'SOURCE.json';

/** What `SOURCE_FILE` holds. */
export interface VendoredSource {
  repository: string;
  commit: string;
  license: string;
  /** The day the data was downloaded, `YYYY-MM-DD`. */
  retrieved: string;
}

function readSource(lichessDir: string): DataSource {
  const { repository, commit, license } = JSON.parse(
    readFileSync(join(lichessDir, SOURCE_FILE), 'utf8'),
  );
  for (const [field, value] of Object.entries({ repository, commit, license })) {
    if (typeof value !== 'string' || !value) {
      throw new Error(`${basename(lichessDir)}/${SOURCE_FILE}: missing "${field}"`);
    }
  }
  return {
    title: repository,
    url: `https://github.com/${repository}/tree/${commit}`,
    revision: commit.slice(0, 7),
    license,
  };
}

/** The encyclopaedia: the named lines in `lichessDir`, each with its ECO code. */
export function loadEncyclopaedia(lichessDir: string): OpeningCollection {
  const source = readSource(lichessDir);
  const rows = VOLUME_FILES.flatMap((file) =>
    parseOpeningsTsv(readFileSync(join(lichessDir, file), 'utf8'), file),
  );
  return { id: ECO_COLLECTION, source, openings: buildOpenings(rows) };
}
