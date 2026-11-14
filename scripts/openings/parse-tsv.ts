import { isEcoCode } from '../../src/eco/taxonomy.ts';

/** One line of a TSV file under its header: its cells, and how to object to them. */
interface TsvRow {
  cells: string[];
  /** Throws an error that names the file and the 1-based line. */
  fail(problem: string): never;
}

/** Splits a TSV file with the header `columns` into rows of that many cells. */
export function parseTsv(text: string, fileName: string, columns: string[]): TsvRow[] {
  const failAt = (line: number) => (problem: string) => {
    throw new Error(`${fileName}:${line}: ${problem}`);
  };

  // Only the final newline is insignificant: a trailing tab is an empty last column.
  const [header, ...lines] = text.replace(/\n$/, '').split('\n');
  const expected = columns.join('\t');
  if (header !== expected) failAt(1)(`expected header ${JSON.stringify(expected)}`);

  return lines.map((line, index) => {
    const fail = failAt(index + 2);
    const cells = line.split('\t');
    if (cells.length !== columns.length) {
      fail(`expected ${columns.length} columns, found ${cells.length}`);
    }
    return { cells, fail };
  });
}

/** A TSV file with the header `columns` and a line for each of `rows`, as `parseTsv` reads one. */
export function formatTsv(columns: string[], rows: (string | number)[][]): string {
  return `${[columns, ...rows].map((row) => row.join('\t')).join('\n')}\n`;
}

/** One row of an upstream `a.tsv`–`e.tsv` file, as written. */
export interface OpeningRow {
  eco: string;
  name: string;
  pgn: string;
}

/** Parses one upstream TSV file. Errors name `fileName` and the 1-based line. */
export function parseOpeningsTsv(text: string, fileName: string): OpeningRow[] {
  return parseTsv(text, fileName, ['eco', 'name', 'pgn']).map(({ cells, fail }) => {
    const [eco = '', name = '', pgn = ''] = cells;
    if (!isEcoCode(eco)) fail(`invalid ECO code ${JSON.stringify(eco)}`);
    if (!name) fail('empty name');
    if (!pgn) fail('empty pgn');
    return { eco, name, pgn };
  });
}
