import { createHash } from 'node:crypto';
import type { Opening } from '../../src/data/opening.ts';
import { slugify } from '../../src/text/slug.ts';
import type { OpeningRow } from './parse-tsv.ts';
import { createReplayer } from './replay.ts';

/** A short fingerprint of a line's moves. */
function fingerprint(uci: string[]): string {
  return createHash('sha256').update(uci.join(' ')).digest('hex').slice(0, 6);
}

/** Turns upstream rows into validated openings, in the same order. */
export function buildOpenings(rows: OpeningRow[], replay = createReplayer()): Opening[] {
  const openings = rows.map(({ eco, name, pgn }) => {
    const { san, uci } = replay(name, pgn);
    return { id: slugify(name), eco, name, san, uci };
  });

  // Upstream repeats a name once per transposition. The shortest line is the canonical one and
  // keeps the plain slug. The others add a fingerprint of their own moves, so that an id never
  // depends on which other lines exist and links survive a data update.
  for (const sameName of Map.groupBy(openings, (opening) => opening.id).values()) {
    const canonical = sameName.reduce((shortest, opening) =>
      opening.san.length < shortest.san.length ? opening : shortest,
    );
    for (const opening of sameName) {
      if (opening !== canonical) opening.id += `-${fingerprint(opening.uci)}`;
    }
  }

  const seen = new Set<string>();
  for (const { id, name } of openings) {
    if (seen.has(id)) throw new Error(`duplicate id ${JSON.stringify(id)} (${name})`);
    seen.add(id);
  }
  return openings;
}
