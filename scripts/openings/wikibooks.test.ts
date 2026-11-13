import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatMoveText } from '../../src/chess/san.ts';
import { isEcoCode } from '../../src/eco/taxonomy.ts';
import { isSlug } from '../../src/text/slug.ts';
import { realWikibooks as openings, realDataset } from '../../tests/support/real-openings.ts';
import { DATA_DIR } from './dataset.ts';
import { createReplayer } from './replay.ts';
import { buildBookOpenings, PAGES_FILE, parsePagesTsv, WIKIBOOKS_DIR } from './wikibooks.ts';

const HEADER = 'page\trevision\tname\tpgn';

describe('parsePagesTsv', () => {
  it('reads a row per page: its id, the revision read, its name and its moves', () => {
    const rows = parsePagesTsv(
      `${HEADER}\n36277\t4567890\tKing's Pawn opening\t1. e4\n36300\t4567999\t\t1. e4 e5\n`,
      'pages.tsv',
    );

    expect(rows).toEqual([
      { page: 36277, revision: 4567890, name: "King's Pawn opening", pgn: '1. e4' },
      { page: 36300, revision: 4567999, name: '', pgn: '1. e4 e5' },
    ]);
  });

  it.each([
    ['page\tname\tpgn\n1\tA\t1. e4\n', /pages\.tsv:1: expected header/],
    [`${HEADER}\n1\t2\tA\n`, /pages\.tsv:2: expected 4 columns, found 3/],
    [`${HEADER}\n1\t2\tA\t1. e4\nx\t2\tA\t1. d4\n`, /pages\.tsv:3: invalid page id "x"/],
    [`${HEADER}\n1\t2.5\tA\t1. e4\n`, /pages\.tsv:2: invalid revision id "2\.5"/],
    [`${HEADER}\n1\t2\tA\t\n`, /pages\.tsv:2: empty pgn/],
  ])('refuses a malformed file, saying where', (text, problem) => {
    expect(() => parsePagesTsv(text, 'pages.tsv')).toThrow(problem);
  });
});

describe('buildBookOpenings', () => {
  const build = (rows: [page: number, name: string, pgn: string][]) =>
    buildBookOpenings(
      rows.map(([page, name, pgn]) => ({ page, revision: page * 10, name, pgn })),
      createReplayer(),
      (positions) => `C${String(positions.length).padStart(2, '0')}`,
    );

  it('makes an opening of each page, with an id that is the page’s own', () => {
    expect(build([[36277, 'Italian game', '1. e4 e5 2. Nf3 Nc6 3. Bc4']])).toEqual([
      {
        id: 'wikibooks-36277',
        eco: 'C05',
        name: 'Italian game',
        san: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
        uci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
        page: 36277,
      },
    ]);
  });

  it('gives a page that names nothing the name of the nearest page above it that does', () => {
    const names = build([
      [4, '', '1. e4 e5 2. Nf3 Nc6'],
      [1, "King's Pawn opening", '1. e4'],
      [5, 'Italian game', '1. e4 e5 2. Nf3 Nc6 3. Bc4'],
      [2, 'Open game', '1. e4 e5'],
      [6, '', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5'],
      [3, '', '1. e4 e5 2. Nf3'],
    ]).map((opening) => opening.name);

    expect(names).toEqual([
      'Open game',
      "King's Pawn opening",
      'Italian game',
      'Open game',
      'Italian game',
      'Open game',
    ]);
  });

  it('looks past a page that is missing from the book', () => {
    const [, orphan] = build([
      [1, 'Open game', '1. e4 e5'],
      [2, '', '1. e4 e5 2. Nf3 Nc6 3. Bc4'],
    ]);

    expect(orphan?.name).toBe('Open game');
  });

  it('calls a line by its moves when nothing above it has a name', () => {
    const [first, second] = build([
      [1, '', '1. a3'],
      [2, '', '1. a3 e5'],
    ]);

    expect(first?.name).toBe('1. a3');
    expect(second?.name).toBe('1. a3 e5');
  });

  it('keeps the order of the rows', () => {
    const ids = build([
      [9, 'B', '1. d4'],
      [3, 'A', '1. e4'],
    ]).map((opening) => opening.id);

    expect(ids).toEqual(['wikibooks-9', 'wikibooks-3']);
  });

  it('fails loudly on an illegal move, naming the page', () => {
    expect(() => build([[7, 'Bongcloud', '1. e4 e5 2. Ke3']])).toThrow(/page 7.*move 3 \(Ke3\)/);
  });

  it('refuses a page listed twice, and two pages with the same moves', () => {
    expect(() =>
      build([
        [7, 'A', '1. e4'],
        [7, 'B', '1. d4'],
      ]),
    ).toThrow(/page 7 is listed twice/);
    expect(() =>
      build([
        [7, 'A', '1. e4'],
        [8, 'B', '1. e4'],
      ]),
    ).toThrow(/pages 7 and 8 are the same line/);
  });
});

describe('the Wikibooks dataset', () => {
  const rows = parsePagesTsv(
    readFileSync(join(DATA_DIR, WIKIBOOKS_DIR, PAGES_FILE), 'utf8'),
    PAGES_FILE,
  );
  const byMoves = new Map(openings.map((opening) => [formatMoveText(opening.san), opening]));

  it('is the second collection, after the encyclopaedia', () => {
    expect(realDataset.collections.map((collection) => collection.id)).toEqual([
      'eco',
      'wikibooks',
    ]);
  });

  it('has an opening for every vendored row', () => {
    expect(openings).toHaveLength(rows.length);
    expect(openings.length).toBeGreaterThan(2500);
  });

  it('says where the data came from: the book, its authors, the day it was read, its licence', () => {
    expect(realDataset.collections[1]?.source).toEqual({
      title: 'Chess Opening Theory',
      url: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory',
      author: 'Wikibooks contributors',
      revision: expect.stringMatching(/^20\d\d-\d\d-\d\d$/),
      license: 'CC-BY-SA-4.0',
    });
  });

  it('gives every opening a unique, URL-safe id that no lichess line has', () => {
    const everyId = realDataset.collections.flatMap((collection) =>
      collection.openings.map((opening) => opening.id),
    );

    expect(new Set(everyId).size).toBe(everyId.length);
    expect(openings.filter(({ id, page }) => !isSlug(id) || id !== `wikibooks-${page}`)).toEqual(
      [],
    );
  });

  it('gives every opening matching SAN and UCI move lists, and no two the same', () => {
    const broken = openings.filter(
      (opening) => opening.san.length === 0 || opening.san.length !== opening.uci.length,
    );

    expect(broken).toEqual([]);
    expect(byMoves.size).toBe(openings.length);
  });

  it('gives every opening an ECO code and a name', () => {
    expect(openings.filter(({ eco }) => !isEcoCode(eco))).toEqual([]);
    expect(openings.filter(({ name }) => !name.trim() || /^\d/.test(name))).toEqual([]);
  });

  it('knows the Ruy López, by the name the book gives it', () => {
    expect(byMoves.get('1. e4 e5 2. Nf3 Nc6 3. Bb5')).toEqual({
      id: expect.stringMatching(/^wikibooks-\d+$/),
      eco: 'C60',
      name: 'Ruy López / Spanish game',
      san: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
      uci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'],
      page: expect.any(Number),
    });
  });

  it.each([
    ['1. e4', 'B00'],
    ['1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6', 'B90'],
    ['1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6', 'E70'],
    ['1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5', 'C57'],
  ])('files %s under %s, as lichess does', (moves, eco) => {
    expect(byMoves.get(moves)?.eco).toBe(eco);
  });

  it('has names for the pages that give none, from the pages above them', () => {
    const unnamed = rows.filter((row) => !row.name);
    expect(unnamed.length).toBeGreaterThan(100);

    for (const { page, pgn } of unnamed) {
      const opening = openings.find((candidate) => candidate.page === page);
      const above = openings.filter(
        (candidate) =>
          candidate.san.length < (opening?.san.length ?? 0) &&
          candidate.san.every((move, ply) => opening?.san[ply] === move),
      );

      expect(
        above.map((candidate) => candidate.name),
        pgn,
      ).toContain(opening?.name);
    }
  });
});
