import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { formatMoveText } from '../../src/chess/san.ts';
import type { DataSource, Opening, OpeningCollection } from '../../src/data/opening.ts';
import { WIKIBOOKS_COLLECTION } from '../../src/wikibooks/arrangement.ts';
import { parseTsv } from './parse-tsv.ts';
import type { Replay } from './replay.ts';

/** Where the Wikibook's data is kept within the data directory. */
export const WIKIBOOKS_DIR = 'wikibooks';

/** The lines of the book, one row to a page. */
export const PAGES_FILE = 'pages.tsv';

/** The columns of `PAGES_FILE`. */
export const PAGE_COLUMNS = ['page', 'revision', 'name', 'pgn'];

/** The file that says which book was read, and when. */
export const SOURCE_FILE = 'SOURCE.json';

/** What `SOURCE_FILE` holds. */
export interface VendoredBook {
  /** The book's title, which is also the title of its first page. */
  book: string;
  /** The wiki it is on, by host name. */
  site: string;
  license: string;
  /** The day the book was read, `YYYY-MM-DD`. Its pages are pinned one by one, by revision. */
  retrieved: string;
}

/** One page of the book that is a line, as vendored. */
export interface PageRow {
  /** The wiki's id for the page, which stays the same if the page is renamed. */
  page: number;
  /** The revision of the page that was read. */
  revision: number;
  /** What the page calls its position; empty if it does not say. */
  name: string;
  /** The moves of its title, in canonical SAN. */
  pgn: string;
}

/** Parses `PAGES_FILE`. Errors name `fileName` and the 1-based line. */
export function parsePagesTsv(text: string, fileName: string): PageRow[] {
  return parseTsv(text, fileName, PAGE_COLUMNS).map(({ cells, fail }) => {
    const [page = '', revision = '', name = '', pgn = ''] = cells;
    if (!/^\d+$/.test(page)) fail(`invalid page id ${JSON.stringify(page)}`);
    if (!/^\d+$/.test(revision)) fail(`invalid revision id ${JSON.stringify(revision)}`);
    if (!pgn) fail('empty pgn');
    return { page: Number(page), revision: Number(revision), name, pgn };
  });
}

/**
 * Turns the book's pages into validated openings, in the same order. `ecoOf` files a line under
 * an ECO code, given the positions it passes through.
 *
 * A page says which opening its position belongs to, so a page that says nothing belongs with
 * the page it follows from: it takes the name of the nearest page above it that has one. A page
 * with no such page above it is called by its moves.
 */
export function buildBookOpenings(
  rows: PageRow[],
  replay: Replay,
  ecoOf: (positions: string[]) => string,
): Opening[] {
  const lines = rows.map((row) => ({ ...row, ...replay(`page ${row.page}`, row.pgn) }));

  // Ids are made from page ids, and a line is filed by its moves: neither may repeat.
  const pages = new Set<number>();
  const byMoves = new Map<string, (typeof lines)[number]>();
  for (const line of lines) {
    if (pages.has(line.page)) throw new Error(`page ${line.page} is listed twice`);
    pages.add(line.page);

    const moves = line.san.join(' ');
    const same = byMoves.get(moves);
    if (same)
      throw new Error(`pages ${same.page} and ${line.page} are the same line (${line.pgn})`);
    byMoves.set(moves, line);
  }

  /** The name of the line itself, or of the longest line it continues that has one. */
  const nameOf = ({ san }: Pick<Opening, 'san'>): string => {
    for (let plies = san.length; plies > 0; plies--) {
      const name = byMoves.get(san.slice(0, plies).join(' '))?.name;
      if (name) return name;
    }
    return formatMoveText(san);
  };

  return lines.map((line) => ({
    id: `${WIKIBOOKS_COLLECTION}-${line.page}`,
    eco: ecoOf(line.positions),
    name: nameOf(line),
    san: line.san,
    uci: line.uci,
    page: line.page,
  }));
}

function readSource(bookDir: string): DataSource {
  const { book, site, license, retrieved } = JSON.parse(
    readFileSync(join(bookDir, SOURCE_FILE), 'utf8'),
  );
  for (const [field, value] of Object.entries({ book, site, license, retrieved })) {
    if (typeof value !== 'string' || !value) {
      throw new Error(`${basename(bookDir)}/${SOURCE_FILE}: missing "${field}"`);
    }
  }
  return {
    title: book,
    url: `https://${site}/wiki/${book.replaceAll(' ', '_')}`,
    author: 'Wikibooks contributors',
    revision: retrieved,
    license,
  };
}

/** The Wikibook: the lines in `bookDir`, each with the ECO code `ecoOf` files it under. */
export function loadWikibooks(
  bookDir: string,
  replay: Replay,
  ecoOf: (positions: string[]) => string,
): OpeningCollection {
  const source = readSource(bookDir);
  const rows = parsePagesTsv(readFileSync(join(bookDir, PAGES_FILE), 'utf8'), PAGES_FILE);
  return { id: WIKIBOOKS_COLLECTION, source, openings: buildBookOpenings(rows, replay, ecoOf) };
}
