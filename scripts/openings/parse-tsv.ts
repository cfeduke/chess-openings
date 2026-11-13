import { isEcoCode } from '../../src/eco/taxonomy.ts';

/** One row of an upstream `a.tsv`–`e.tsv` file, as written. */
export interface OpeningRow {
  eco: string;
  name: string;
  pgn: string;
}

const HEADER = 'eco\tname\tpgn';

/** Parses one upstream TSV file. Errors name `fileName` and the 1-based line. */
export function parseOpeningsTsv(text: string, fileName: string): OpeningRow[] {
  const fail = (line: number, problem: string): never => {
    throw new Error(`${fileName}:${line}: ${problem}`);
  };

  // Only the final newline is insignificant: a trailing tab is an empty last column.
  const [header, ...lines] = text.replace(/\n$/, '').split('\n');
  if (header !== HEADER) fail(1, `expected header ${JSON.stringify(HEADER)}`);

  return lines.map((line, index) => {
    const lineNumber = index + 2;
    const columns = line.split('\t');
    if (columns.length !== 3) fail(lineNumber, `expected 3 columns, found ${columns.length}`);

    const [eco = '', name = '', pgn = ''] = columns;
    if (!isEcoCode(eco)) fail(lineNumber, `invalid ECO code ${JSON.stringify(eco)}`);
    if (!name) fail(lineNumber, 'empty name');
    if (!pgn) fail(lineNumber, 'empty pgn');
    return { eco, name, pgn };
  });
}
