import { parseMoveText } from '../chess/san.ts';
import type { Opening } from '../data/opening.ts';
import { isEcoCode } from '../eco/taxonomy.ts';
import { foldText } from '../text/fold.ts';

export interface SearchResult {
  /** The best matches, at most `limit` of them. */
  matches: Opening[];
  /** How many openings matched in all. */
  total: number;
}

/** What a query is compared against, prepared once per opening. */
interface Entry {
  opening: Opening;
  /** The words of the name, folded: `King's Gambit` → `['kings', 'gambit']`. */
  words: string[];
  /** The moves, folded, each followed by a space: `e4 nf3 ` — so a prefix ends on a whole move. */
  moves: string;
}

const SAN_MOVE = /^([kqrbn]?[a-h]?[1-8]?x?[a-h][1-8](=[qrbn])?|o-o(-o)?)$/;

function nameWords(text: string): string[] {
  return foldText(text)
    .replace(/'/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Folds moves so that `Nf3`, `nf3`, `0-0`/`O-O` and `Bb4+`/`Bb4` compare equal. */
function foldMoves(san: string[]): string {
  return san
    .map((move) => `${move.toLowerCase().replaceAll('0', 'o').replace(/[+#]/g, '')} `)
    .join('');
}

/** General lines before specific ones: shorter names first, then shorter lines. */
function mostGeneralFirst(a: Opening, b: Opening): number {
  return a.name.length - b.name.length || a.san.length - b.san.length;
}

/**
 * Prepares `openings` for searching and returns the search function. A query can be:
 *
 * - moves — `1. e4 c5 2. Nf3` or `e4 c5 nf3` — finding the lines that start with them;
 * - words — `sicil naj` — each a prefix of some word in the name, accents and case ignored;
 * - an ECO code — `B90` — optionally followed by words.
 */
export function createSearch(openings: Opening[]): (query: string, limit?: number) => SearchResult {
  const entries: Entry[] = openings.map((opening) => ({
    opening,
    words: nameWords(opening.name),
    moves: foldMoves(opening.san),
  }));

  const byMoves = (query: string): Opening[] => {
    const prefix = foldMoves(parseMoveText(query));
    if (
      !prefix
        .trim()
        .split(' ')
        .every((move) => SAN_MOVE.test(move))
    )
      return [];
    return entries
      .filter((entry) => entry.moves.startsWith(prefix))
      .map((entry) => entry.opening)
      .sort((a, b) => a.san.length - b.san.length);
  };

  const byName = (query: string): Opening[] => {
    const terms = query.split(/\s+/);
    const codes = terms
      .filter((term) => isEcoCode(term.toUpperCase()))
      .map((code) => code.toUpperCase());
    const words = terms.filter((term) => !isEcoCode(term.toUpperCase())).flatMap(nameWords);
    return entries
      .filter(
        (entry) =>
          codes.every((code) => entry.opening.eco === code) &&
          words.every((word) => entry.words.some((candidate) => candidate.startsWith(word))),
      )
      .map((entry) => entry.opening)
      .sort(mostGeneralFirst);
  };

  return (query, limit = 50) => {
    const trimmed = query.trim();
    if (!trimmed) return { matches: [], total: 0 };

    const lines = byMoves(trimmed);
    const found = lines.length > 0 ? lines : byName(trimmed);
    return { matches: found.slice(0, limit), total: found.length };
  };
}
