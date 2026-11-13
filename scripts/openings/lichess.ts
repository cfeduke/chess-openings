import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataSource, OpeningCollection } from '../../src/data/opening.ts';
import { ECO_COLLECTION } from '../../src/eco/arrangement.ts';
import { buildOpenings } from './build.ts';
import { parseOpeningsTsv } from './parse-tsv.ts';
import type { Replay } from './replay.ts';
import { readSourceFile } from './source.ts';

/** Where lichess's data is kept within the data directory. */
export const LICHESS_DIR = 'lichess';

/** One file per ECO volume. */
export const VOLUME_FILES = ['a.tsv', 'b.tsv', 'c.tsv', 'd.tsv', 'e.tsv'];

/** What the source file holds: the upstream commit the vendored data is pinned to. */
export interface VendoredSource {
  repository: string;
  commit: string;
  license: string;
  /** The day the data was downloaded, `YYYY-MM-DD`. */
  retrieved: string;
}

function readSource(lichessDir: string): DataSource {
  const { repository, commit, license } = readSourceFile(lichessDir, [
    'repository',
    'commit',
    'license',
  ]);
  return {
    title: repository,
    url: `https://github.com/${repository}/tree/${commit}`,
    revision: commit.slice(0, 7),
    license,
  };
}

/** The encyclopaedia: the named lines in `lichessDir`, each with its ECO code. */
export function loadEncyclopaedia(lichessDir: string, replay: Replay): OpeningCollection {
  const source = readSource(lichessDir);
  const rows = VOLUME_FILES.flatMap((file) =>
    parseOpeningsTsv(readFileSync(join(lichessDir, file), 'utf8'), file),
  );
  return { id: ECO_COLLECTION, source, openings: buildOpenings(rows, replay) };
}
