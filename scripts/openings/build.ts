import { Chess } from 'chess.js';
import type { Opening } from '../../src/data/opening.ts';
import { slugify } from '../../src/text/slug.ts';
import type { OpeningRow } from './parse-tsv.ts';

const MOVE_NUMBER = /^\d+\.+$/;

/**
 * Replays `pgn` from the starting position with a real rules engine, so the browser never
 * needs one. Throws on an illegal move or on SAN that is not in canonical form.
 */
function replay(name: string, pgn: string): Pick<Opening, 'san' | 'uci'> {
  const game = new Chess();
  const san: string[] = [];
  const uci: string[] = [];
  for (const token of pgn.split(' ')) {
    if (MOVE_NUMBER.test(token)) continue;
    try {
      const move = game.move(token, { strict: true });
      san.push(move.san);
      uci.push(move.lan);
    } catch {
      throw new Error(
        `${name}: illegal or non-canonical move ${san.length + 1} (${token}) in "${pgn}"`,
      );
    }
  }
  return { san, uci };
}

/**
 * Upstream repeats a name once per transposition. The shortest line is the canonical one and
 * gets the plain slug; the others are numbered `-2`, `-3`, … in file order.
 */
function assignIds(openings: Omit<Opening, 'id'>[]): string[] {
  const bySlug = Map.groupBy(openings, (opening) => slugify(opening.name));
  const ids = new Map<Omit<Opening, 'id'>, string>();
  for (const [slug, sameName] of bySlug) {
    const shortestFirst = sameName.toSorted((a, b) => a.san.length - b.san.length);
    shortestFirst.forEach((opening, rank) => {
      ids.set(opening, rank === 0 ? slug : `${slug}-${rank + 1}`);
    });
  }

  const seen = new Set<string>();
  return openings.map((opening) => {
    const id = ids.get(opening) as string;
    if (seen.has(id)) throw new Error(`duplicate id ${JSON.stringify(id)} (${opening.name})`);
    seen.add(id);
    return id;
  });
}

/** Turns upstream rows into validated openings, in the same order. */
export function buildOpenings(rows: OpeningRow[]): Opening[] {
  const replayed = rows.map(({ eco, name, pgn }) => ({ eco, name, ...replay(name, pgn) }));
  const ids = assignIds(replayed);
  return replayed.map((opening, index) => ({ id: ids[index] as string, ...opening }));
}
