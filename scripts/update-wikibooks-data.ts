// Refreshes the vendored lines of the Wikibook: `node scripts/update-wikibooks-data.ts`.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { Chess } from 'chess.js';
import { formatMoveText } from '../src/chess/san.ts';
import { BOOK, SITE } from '../src/wikibooks/book.ts';
import { DATA_DIR } from './openings/dataset.ts';
import { formatTsv } from './openings/parse-tsv.ts';
import { formatSourceFile, SOURCE_FILE, today, USER_AGENT } from './openings/source.ts';
import {
  PAGE_COLUMNS,
  PAGES_FILE,
  type PageRow,
  type VendoredWikibook,
  WIKIBOOKS_DIR,
} from './openings/wikibooks.ts';
import { movesOfTitle, nameOfPage } from './wikibooks/page.ts';

const API = `https://${SITE}/w/api.php`;

/** Every page under the book's title, with the text of its latest revision. */
const QUERY = {
  action: 'query',
  format: 'json',
  formatversion: '2',
  generator: 'allpages',
  gapprefix: `${BOOK}/`,
  gapnamespace: '0',
  gapfilterredir: 'nonredirects',
  gaplimit: '50',
  prop: 'revisions',
  rvprop: 'ids|content',
  rvslots: 'main',
};

/** What the API answers with, as far as it is read here. */
interface ApiAnswer {
  /** Parameters to ask again with, to be given the next batch; absent after the last. */
  continue?: Record<string, string>;
  query?: {
    pages?: {
      pageid: number;
      title: string;
      /** Missing when the batch was full before the API got to this page's text. */
      revisions?: { revid: number; slots: { main: { content: string } } }[];
    }[];
  };
}

interface UpdateIo {
  fetchJson(url: string): Promise<unknown>;
  writeFile(path: string, contents: string): Promise<void>;
  /** Today's date as `YYYY-MM-DD`. */
  today(): string;
}

/** What an update did. */
interface UpdateReport {
  /** How many lines were written. */
  lines: number;
  /** The pages that were left out, by title, and why each was. */
  skipped: { title: string; reason: string }[];
}

/** The moves of a title in canonical SAN — or what is wrong with them, as a string. */
function canonicalMoves(moves: string[]): string[] | string {
  const game = new Chess();
  const san: string[] = [];
  for (const move of moves) {
    try {
      // Titles leave off check marks and are not always written the one canonical way.
      san.push(game.move(move, { strict: false }).san);
    } catch {
      return `illegal move ${san.length + 1} (${move})`;
    }
  }
  return san;
}

/**
 * Reads every page of the book and writes a row for each one that is a line: a page whose title
 * is a legal game. The rows are in the order of their moves, so the file changes only where the
 * book did.
 */
export async function updateWikibooksData(dataDir: string, io: UpdateIo): Promise<UpdateReport> {
  const pages = new Map<number, { page: number; title: string; revision: number; text: string }>();
  for (let next: Record<string, string> | undefined = {}; next; ) {
    const answer = (await io.fetchJson(
      `${API}?${new URLSearchParams({ ...QUERY, ...next })}`,
    )) as ApiAnswer;
    for (const { pageid, title, revisions: [latest] = [] } of answer.query?.pages ?? []) {
      if (!latest) continue;
      const text = latest.slots.main.content;
      pages.set(pageid, { page: pageid, title, revision: latest.revid, text });
    }
    next = answer.continue;
  }

  const rows = new Map<string, PageRow>();
  const skipped: UpdateReport['skipped'] = [];
  // Oldest page first, so that of two pages for one line the original is the one kept.
  for (const { page, title, revision, text } of [...pages.values()].sort(
    (a, b) => a.page - b.page,
  )) {
    const moves = movesOfTitle(title);
    const san = moves ? canonicalMoves(moves) : 'not a line';
    if (typeof san === 'string') {
      skipped.push({ title, reason: san });
      continue;
    }

    const pgn = formatMoveText(san);
    const same = rows.get(pgn);
    if (same) skipped.push({ title, reason: `the same line as page ${same.page}` });
    else rows.set(pgn, { page, revision, name: nameOfPage(text), pgn });
  }
  if (rows.size === 0) throw new Error(`${API}: "${BOOK}" has no lines`);

  const table = [...rows.values()]
    .sort((a, b) => (a.pgn < b.pgn ? -1 : 1))
    .map(({ page, revision, name, pgn }) => [page, revision, name, pgn]);
  await io.writeFile(join(dataDir, PAGES_FILE), formatTsv(PAGE_COLUMNS, table));

  const source: VendoredWikibook = {
    book: BOOK,
    site: SITE,
    license: 'CC-BY-SA-4.0',
    retrieved: io.today(),
  };
  await io.writeFile(join(dataDir, SOURCE_FILE), formatSourceFile(source));

  skipped.sort((a, b) => (a.title < b.title ? -1 : 1));
  return { lines: rows.size, skipped };
}

/**
 * Fetches from the wiki without leaning on it: one request at a time, a pause before each, and
 * when it says to wait, waiting as long as it says before asking again.
 */
async function fetchJsonPolitely(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    await pause(1000);
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (response.ok) return response.json();

    const wait = Number(response.headers.get('retry-after'));
    const busy = response.status === 429 || response.status === 503;
    if (!busy || attempt === 5) throw new Error(`${url}: HTTP ${response.status}`);
    await pause((Number.isFinite(wait) && wait > 0 ? wait : 30) * 1000);
  }
}

if (import.meta.main) {
  const dataDir = join(DATA_DIR, WIKIBOOKS_DIR);
  const { lines, skipped } = await updateWikibooksData(dataDir, {
    fetchJson: fetchJsonPolitely,
    writeFile,
    today,
  });
  console.log(`${dataDir}: ${lines} lines of "${BOOK}".`);
  for (const { title, reason } of skipped) console.log(`  left out ${title}: ${reason}`);
  console.log('Run "npm run verify" before committing.');
}
