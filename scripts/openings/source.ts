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
): Record<Field, string> {
  const record = JSON.parse(readFileSync(join(sourceDir, SOURCE_FILE), 'utf8'));
  for (const field of fields) {
    if (typeof record[field] !== 'string' || !record[field]) {
      throw new Error(`${basename(sourceDir)}/${SOURCE_FILE}: missing "${field}"`);
    }
  }
  return record;
}
