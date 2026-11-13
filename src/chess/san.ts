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
