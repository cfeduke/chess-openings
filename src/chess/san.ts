/**
 * The moves in a piece of PGN-style move text, without the move numbers:
 * `1. e4 c5 2.Nf3` → `['e4', 'c5', 'Nf3']`.
 */
export function parseMoveText(text: string): string[] {
  return text
    .replace(/\d+\.+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Numbered move text for a list of moves: `['e4', 'c5', 'Nf3']` → `1. e4 c5 2. Nf3`. */
export function formatMoveText(san: string[]): string {
  return san.map((move, ply) => (ply % 2 === 0 ? `${ply / 2 + 1}. ${move}` : move)).join(' ');
}

/**
 * A spelling of a SAN move for comparing what people type with what is on record:
 * case, `0-0` versus `O-O`, and check marks stop mattering.
 */
export function foldSan(move: string): string {
  return move.toLowerCase().replaceAll('0', 'o').replace(/[+#]/g, '');
}

const FOLDED_SAN = /^([kqrbn]?[a-h]?[1-8]?x?[a-h][1-8](=[qrbn])?|o-o(-o)?)$/;

/** Whether `text` has the shape of a SAN move. Says nothing about whether it is legal. */
export function looksLikeSan(text: string): boolean {
  return FOLDED_SAN.test(foldSan(text));
}

/** Whether a SAN move is marked as giving check or mate. */
export function givesCheck(san: string): boolean {
  return /[+#]$/.test(san);
}
