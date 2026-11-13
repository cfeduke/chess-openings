import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { parseMoveText } from '../../src/chess/san.ts';
import type { Opening } from '../../src/data/opening.ts';
import { slugify } from '../../src/text/slug.ts';
import type { OpeningRow } from './parse-tsv.ts';

/** One move, and the position (as FEN) it leads to. */
interface Ply {
  san: string;
  uci: string;
  fen: string;
}

/**
 * Replays `pgn` from the starting position with a real rules engine, so the browser never
 * needs one. Throws on an illegal move or on SAN that is not in canonical form.
 *
 * Lines share most of their opening moves, so `played` remembers every move sequence seen so
 * far and the engine only plays the part of a line that is new.
 */
function replay(name: string, pgn: string, played: Map<string, Ply>): Pick<Opening, 'san' | 'uci'> {
  const san: string[] = [];
  const uci: string[] = [];
  let sequence = '';
  let fen: string | undefined;
  let game: Chess | undefined;
  for (const token of parseMoveText(pgn)) {
    sequence += ` ${token}`;
    let ply = played.get(sequence);
    if (!ply) {
      game ??= new Chess(fen);
      try {
        const move = game.move(token, { strict: true });
        ply = { san: move.san, uci: move.lan, fen: move.after };
      } catch (cause) {
        const problem = `illegal or non-canonical move ${san.length + 1} (${token})`;
        throw new Error(`${name}: ${problem} in "${pgn}"`, { cause });
      }
      played.set(sequence, ply);
    }
    fen = ply.fen;
    san.push(ply.san);
    uci.push(ply.uci);
  }
  return { san, uci };
}

/** A short fingerprint of a line's moves. */
function fingerprint(uci: string[]): string {
  return createHash('sha256').update(uci.join(' ')).digest('hex').slice(0, 6);
}

/** Turns upstream rows into validated openings, in the same order. */
export function buildOpenings(rows: OpeningRow[]): Opening[] {
  const played = new Map<string, Ply>();
  const openings = rows.map(({ eco, name, pgn }) => ({
    id: slugify(name),
    eco,
    name,
    ...replay(name, pgn, played),
  }));

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
