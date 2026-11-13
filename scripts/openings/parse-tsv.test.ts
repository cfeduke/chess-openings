import { describe, expect, it } from 'vitest';
import { parseOpeningsTsv } from './parse-tsv.ts';

const HEADER = 'eco\tname\tpgn\n';

describe('parseOpeningsTsv', () => {
  it('parses rows after the header, ignoring the trailing newline', () => {
    const text = `${HEADER}A00\tAmar Opening\t1. Nh3\nA00\tAmar Opening: Paris Gambit\t1. Nh3 d5 2. g3 e5 3. f4\n`;

    expect(parseOpeningsTsv(text, 'a.tsv')).toEqual([
      { eco: 'A00', name: 'Amar Opening', pgn: '1. Nh3' },
      { eco: 'A00', name: 'Amar Opening: Paris Gambit', pgn: '1. Nh3 d5 2. g3 e5 3. f4' },
    ]);
  });

  it('rejects a file without the expected header', () => {
    expect(() =>
      parseOpeningsTsv('code\ttitle\tmoves\nA00\tAmar Opening\t1. Nh3\n', 'a.tsv'),
    ).toThrow(/a\.tsv:1: expected header "eco\\tname\\tpgn"/);
  });

  it('reports the file and line of a row with the wrong number of columns', () => {
    const text = `${HEADER}A00\tAmar Opening\t1. Nh3\nA00\tAmar Opening: Paris Gambit\n`;

    expect(() => parseOpeningsTsv(text, 'a.tsv')).toThrow(/a\.tsv:3: expected 3 columns, found 2/);
  });

  it.each(['F00', 'A1', 'a00', 'A100', ''])('rejects the invalid ECO code %j', (eco) => {
    expect(() => parseOpeningsTsv(`${HEADER}${eco}\tAmar Opening\t1. Nh3\n`, 'a.tsv')).toThrow(
      /a\.tsv:2: invalid ECO code/,
    );
  });

  it('rejects rows with an empty name or move list', () => {
    expect(() => parseOpeningsTsv(`${HEADER}A00\t\t1. Nh3\n`, 'a.tsv')).toThrow(
      /a\.tsv:2: empty name/,
    );
    expect(() => parseOpeningsTsv(`${HEADER}A00\tAmar Opening\t\n`, 'a.tsv')).toThrow(
      /a\.tsv:2: empty pgn/,
    );
  });
});
