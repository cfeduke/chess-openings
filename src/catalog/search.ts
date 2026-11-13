import { foldSan, looksLikeSan, parseMoveText } from '../chess/san.ts';
import type { Opening } from '../data/opening.ts';
import { isEcoCode } from '../eco/taxonomy.ts';
import { foldWords } from '../text/fold.ts';

export interface SearchResult {
  /** The best matches, at most `limit` of them. */
  matches: Opening[];
  /** How many openings matched in all. */
  total: number;
}

/** General lines before specific ones: shorter names first, then shorter lines. */
function mostGeneralFirst(a: Opening, b: Opening): number {
  return a.name.length - b.name.length || a.san.length - b.san.length;
}

/** General lines before specific ones, where a name says nothing of that: shorter lines first. */
function shortestLineFirst(a: Opening, b: Opening): number {
  return a.san.length - b.san.length || a.name.length - b.name.length;
}

interface SearchOptions {
  /**
   * Whether a longer name means a more specific line, as with lichess's `Family: Variation,
   * Subvariation`. Where names do not nest — a book gives one name to every position of an
   * opening — a line is as specific as it is long, and that is what the matches are ordered by.
   */
  namesNest?: boolean;
}

/**
 * Prepares `openings` for searching and returns the search function. Every term of a query
 * narrows the results, according to what it looks like:
 *
 * - an ECO code — `B90` — keeps the lines filed under it;
 * - moves — `1. e4 c5 2. Nf3`, or just `e4 c5 nf3` — keep the lines that start with them;
 * - anything else — `sicil naj` — must begin a word of the name, ignoring accents and case.
 */
export function createSearch(
  openings: Opening[],
  { namesNest = true }: SearchOptions = {},
): (query: string, limit?: number) => SearchResult {
  const entries = openings.map((opening) => ({
    opening,
    words: foldWords(opening.name),
    moves: opening.san.map(foldSan),
  }));

  return (query, limit = 50) => {
    const codes: string[] = [];
    const moves: string[] = [];
    const words: string[] = [];
    for (const term of parseMoveText(query)) {
      if (isEcoCode(term.toUpperCase())) codes.push(term.toUpperCase());
      else if (looksLikeSan(term)) moves.push(foldSan(term));
      else words.push(...foldWords(term));
    }
    if (codes.length + moves.length + words.length === 0) return { matches: [], total: 0 };

    const found = entries
      .filter(
        (entry) =>
          codes.every((code) => entry.opening.eco === code) &&
          moves.every((move, ply) => entry.moves[ply] === move) &&
          words.every((word) => entry.words.some((candidate) => candidate.startsWith(word))),
      )
      .map((entry) => entry.opening)
      .sort(moves.length > 0 || !namesNest ? shortestLineFirst : mostGeneralFirst);
    return { matches: found.slice(0, limit), total: found.length };
  };
}
