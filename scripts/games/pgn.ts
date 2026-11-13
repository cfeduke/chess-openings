/**
 * Reads games in PGN as lichess writes them in its database: each game's tags, a blank line, its
 * moves on one line with the result at the end, a blank line. It reads no more of PGN than that.
 */

/** The tags of a game, by name: `Event`, `Result`, `WhiteElo`… */
export type Tags = Readonly<Record<string, string | undefined>>;

/** Calls `visit` with the tags and the move text of each game in `pgn`, in order. */
export function eachGame(pgn: string, visit: (tags: Tags, moveText: string) => void): void {
  let tags: Record<string, string> | undefined;
  let moveText = '';
  /** Whether the blank line that ends the tags has been read. */
  let tagsOver = false;

  const finish = () => {
    if (tags) visit(tags, moveText);
    tags = undefined;
    moveText = '';
    tagsOver = false;
  };

  for (let at = 0; at < pgn.length; ) {
    let end = pgn.indexOf('\n', at);
    if (end === -1) end = pgn.length;

    if (end === at) {
      if (moveText) finish();
      else tagsOver = tags !== undefined;
    } else if (pgn.charCodeAt(at) === 91 /* [ */ && !moveText) {
      // A tag where moves should be: the game before had none, and this is the next.
      if (tagsOver) finish();
      const space = pgn.indexOf(' ', at);
      tags ??= {};
      tags[pgn.slice(at + 1, space)] = pgn.slice(space + 2, pgn.lastIndexOf('"', end));
    } else {
      const line = pgn.slice(at, end).trim();
      moveText = moveText ? `${moveText} ${line}` : line;
    }
    at = end + 1;
  }
  finish();
}

const isDigit = (character: number) => character >= 48 && character <= 57;

/**
 * The first `limit` moves of a game's move text, in SAN, without what is written around them:
 * move numbers, comments in braces, verdicts such as `?!`, the result.
 */
export function movesOf(moveText: string, limit: number): string[] {
  const moves: string[] = [];
  for (let at = 0; at < moveText.length && moves.length < limit; ) {
    const first = moveText.charCodeAt(at);
    if (first === 32 /* space */) {
      at++;
    } else if (first === 123 /* { */) {
      const close = moveText.indexOf('}', at);
      at = close === -1 ? moveText.length : close + 1;
    } else {
      let end = moveText.indexOf(' ', at);
      if (end === -1) end = moveText.length;
      // A move begins with a letter: a piece, a file, or the O of castling. Numbers, results
      // and `$` verdicts do not.
      if (first >= 65) {
        let last = end;
        while (moveText.charCodeAt(last - 1) === 33 || moveText.charCodeAt(last - 1) === 63) last--;
        moves.push(moveText.slice(at, last));
      }
      at = end;
    }
  }
  return moves;
}

/**
 * How many moves a game went on for, counting each side's, told from the number of its last
 * move without reading the ones before.
 */
export function pliesOf(moveText: string): number {
  // The last move number is the last full stop before a space: comments hold none.
  const stop = moveText.lastIndexOf('. ');
  if (stop === -1) return 0;

  // Black's moves are numbered with three, as in `12... Nf6`.
  let digit = stop - 1;
  while (moveText.charCodeAt(digit) === 46) digit--;
  const byBlack = digit < stop - 1;
  let from = digit;
  while (from > 0 && isDigit(moveText.charCodeAt(from - 1))) from--;
  const number = Number(moveText.slice(from, digit + 1));

  return byBlack ? number * 2 : (number - 1) * 2 + movesOf(moveText.slice(stop + 1), 2).length;
}
