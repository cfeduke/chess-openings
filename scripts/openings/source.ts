import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

/** The file, in the directory of each source, that says what was vendored and from where. */
export const SOURCE_FILE = 'SOURCE.json';

/**
 * Reads `fields` from the `SOURCE_FILE` of the source vendored in `sourceDir`. Each must be
 * there, and say something: data that cannot be traced to where it came from is refused.
 */
export function readSourceFile<Field extends string>(
  sourceDir: string,
  fields: readonly Field[],
): Record<Field, string> & Record<string, unknown> {
  const record = JSON.parse(readFileSync(join(sourceDir, SOURCE_FILE), 'utf8'));
  for (const field of fields) {
    if (typeof record[field] !== 'string' || !record[field]) {
      throw new Error(`${basename(sourceDir)}/${SOURCE_FILE}: missing "${field}"`);
    }
  }
  return record;
}

/** What `SOURCE_FILE` is to hold for a source of which `record` is to be said. */
export function formatSourceFile(record: object): string {
  return `${JSON.stringify(record, null, 2)}\n`;
}

/** Today's date as `YYYY-MM-DD`, for saying when a source was read. */
export const today = () => new Date().toISOString().slice(0, 10);

/** Says who is asking, to a source that is read over the network. */
export const USER_AGENT = 'chess-openings (https://github.com/cfeduke/chess-openings)';
