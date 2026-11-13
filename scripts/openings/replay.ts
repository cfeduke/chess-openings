import { Chess } from 'chess.js';
import { parseMoveText } from '../../src/chess/san.ts';
import type { Opening } from '../../src/data/opening.ts';

/** A line that has been played through. */
export interface ReplayedLine extends Pick<Opening, 'san' | 'uci'> {
  /**
   * The position after each move: where the pieces are, whose move it is and who may still
   * castle. Two lines that reach the same position by different roads have the same one.
   */
  positions: string[];
}

/** Plays the line `pgn` through from the starting position; `name` is for naming it in an error. */
export type Replay = (name: string, pgn: string) => ReplayedLine;

/** One move, and the position (as FEN) it leads to. */
interface Ply {
  san: string;
  uci: string;
  fen: string;
}

/** What makes a position the same position: the board, the side to move, the castling rights. */
const positionOf = (fen: string) => fen.split(' ', 3).join(' ');

/**
 * Replays lines with a real rules engine, so the browser never needs one. A replay throws on an
 * illegal move or on SAN that is not in canonical form.
 *
 * Lines share most of their opening moves, so every move sequence seen is remembered and the
 * engine only plays the part of a line that is new.
 */
export function createReplayer(): Replay {
  const played = new Map<string, Ply>();

  return (name, pgn) => {
    const line: ReplayedLine = { san: [], uci: [], positions: [] };
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
          const problem = `illegal or non-canonical move ${line.san.length + 1} (${token})`;
          throw new Error(`${name}: ${problem} in "${pgn}"`, { cause });
        }
        played.set(sequence, ply);
      }
      fen = ply.fen;
      line.san.push(ply.san);
      line.uci.push(ply.uci);
      line.positions.push(positionOf(ply.fen));
    }
    return line;
  };
}
