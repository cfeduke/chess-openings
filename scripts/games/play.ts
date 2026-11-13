/**
 * Plays through games that are known to be legal, a hundred million at a sitting, which is more
 * than a rules engine has the time for. Nothing is validated: a move in SAN names a piece and the
 * square it goes to, and the piece is found by looking back from that square. The rules come into
 * it only where SAN leans on them — when two pieces could make the move and one of them is pinned.
 */

/** A game being played through from the starting position. */
export interface Game {
  /** Plays a move written in SAN. Throws if no piece of the side to move can make it. */
  play(san: string): void;
  /** Sets the pieces up again, for another game. */
  restart(): void;
  /** The position reached, as `positionOf` in `replay.ts` writes one. */
  position(): string;
}

// A piece is the character code of its FEN letter: White's are capitals, Black's small.
const code = (letter: string) => letter.charCodeAt(0);
const PAWN = code('P');
const KNIGHT = code('N');
const BISHOP = code('B');
const ROOK = code('R');
const QUEEN = code('Q');
const KING = code('K');
/** What makes a White piece the Black one of its kind. */
const BLACK = 0x20;
const EMPTY = 0;

// A square is its rank times eight plus its file, both counted from nought: a1 is 0, h8 is 63.
const A1 = 0;
const E1 = 4;
const H1 = 7;
const A8 = 56;
const E8 = 60;
const H8 = 63;

/** The board before a move is made, from a1 to h8. */
const START = Uint8Array.from(`RNBQKBNRPPPPPPPP${'\0'.repeat(32)}pppppppprnbqkbnr`, (letter) =>
  letter === '\0' ? EMPTY : code(letter),
);

// The rights to castle, as bits, and each combination of them as FEN writes it.
const WHITE_SHORT = 1;
const WHITE_LONG = 2;
const BLACK_SHORT = 4;
const BLACK_LONG = 8;
const RIGHTS_TEXT = Array.from(
  { length: 16 },
  (_, rights) => ['K', 'Q', 'k', 'q'].filter((_letter, bit) => rights & (1 << bit)).join('') || '-',
);

/**
 * The rights that outlast a move from or to each square. A king or rook that leaves its square
 * gives its rights up, and so does a rook that is captured on it, however the game goes on.
 */
const RIGHTS_KEPT = new Uint8Array(64).fill(15);
RIGHTS_KEPT[A1] = 15 & ~WHITE_LONG;
RIGHTS_KEPT[E1] = 15 & ~(WHITE_SHORT | WHITE_LONG);
RIGHTS_KEPT[H1] = 15 & ~WHITE_SHORT;
RIGHTS_KEPT[A8] = 15 & ~BLACK_LONG;
RIGHTS_KEPT[E8] = 15 & ~(BLACK_SHORT | BLACK_LONG);
RIGHTS_KEPT[H8] = 15 & ~BLACK_SHORT;

// Steps across the board, as pairs of files and ranks: the rook's four, then the bishop's.
const LINES = [1, 0, -1, 0, 0, 1, 0, -1, 1, 1, 1, -1, -1, 1, -1, -1];
const ROOK_LINES = [0, 8];
const BISHOP_LINES = [8, 16];
const QUEEN_LINES = [0, 16];
const KNIGHT_JUMPS = [1, 2, 2, 1, 2, -1, 1, -2, -1, -2, -2, -1, -2, 1, -1, 2];

const LETTERS = Array.from({ length: 128 }, (_, piece) => String.fromCharCode(piece));

/** A game at its starting position. */
export function createGame(): Game {
  const board = new Uint8Array(64);
  let whiteToMove = true;
  let rights = 15;
  /** The squares the pieces that might be meant stand on, and how many of them there are. */
  const candidates = new Uint8Array(16);
  let found = 0;

  function restart(): void {
    board.set(START);
    whiteToMove = true;
    rights = 15;
  }

  const refuse = (san: string): never => {
    throw new Error(`no piece can play ${san} in "${position()}"`);
  };

  function position(): string {
    let text = '';
    for (let rank = 7; rank >= 0; rank--) {
      let empty = 0;
      for (let square = rank * 8; square < rank * 8 + 8; square++) {
        const piece = board[square] as number;
        if (piece === EMPTY) {
          empty++;
        } else {
          if (empty > 0) text += empty;
          empty = 0;
          text += LETTERS[piece];
        }
      }
      if (empty > 0) text += empty;
      if (rank > 0) text += '/';
    }
    return `${text} ${whiteToMove ? 'w' : 'b'} ${RIGHTS_TEXT[rights]}`;
  }

  /** Notes `square` as a candidate if `piece` stands there and it is where the move says. */
  function consider(square: number, piece: number, fromFile: number, fromRank: number): void {
    if (board[square] !== piece) return;
    if (fromFile >= 0 && (square & 7) !== fromFile) return;
    if (fromRank >= 0 && square >> 3 !== fromRank) return;
    candidates[found++] = square;
  }

  /** Looks along `lines` from `to` for the pieces like `piece` that could come to it. */
  function lookAlong(
    [first, end]: number[],
    to: number,
    piece: number,
    fromFile: number,
    fromRank: number,
  ): void {
    for (let line = first as number; line < (end as number); line += 2) {
      const fileStep = LINES[line] as number;
      const rankStep = LINES[line + 1] as number;
      let file = (to & 7) + fileStep;
      let rank = (to >> 3) + rankStep;
      while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        const square = rank * 8 + file;
        if (board[square] !== EMPTY) {
          consider(square, piece, fromFile, fromRank);
          break;
        }
        file += fileStep;
        rank += rankStep;
      }
    }
  }

  /** Whether one of the other side's pieces that move in lines bears on `square`. */
  function inLineOfFire(square: number): boolean {
    const theirs = whiteToMove ? BLACK : 0;
    for (let line = 0; line < 16; line += 2) {
      const fileStep = LINES[line] as number;
      const rankStep = LINES[line + 1] as number;
      let file = (square & 7) + fileStep;
      let rank = (square >> 3) + rankStep;
      while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        const piece = board[rank * 8 + file] as number;
        if (piece !== EMPTY) {
          if (piece === (QUEEN | theirs) || piece === ((line < 8 ? ROOK : BISHOP) | theirs)) {
            return true;
          }
          break;
        }
        file += fileStep;
        rank += rankStep;
      }
    }
    return false;
  }

  /**
   * Whether the piece on `from` may not go to `to` because its king would be left in check.
   * The candidates for a move differ only in the square they leave, and all that leaving a
   * square can do is open a line: so only the pieces that move in lines need be looked for.
   */
  function isPinned(from: number, to: number): boolean {
    const piece = board[from] as number;
    const taken = board[to] as number;
    board[from] = EMPTY;
    board[to] = piece;
    const exposed = inLineOfFire(board.indexOf(KING | (whiteToMove ? 0 : BLACK)));
    board[from] = piece;
    board[to] = taken;
    return exposed;
  }

  /** Moves whatever is on `from` to `to`, and gives the move to the other side. */
  function move(from: number, to: number, becoming = board[from] as number): void {
    board[from] = EMPTY;
    board[to] = becoming;
    rights &= (RIGHTS_KEPT[from] as number) & (RIGHTS_KEPT[to] as number);
    whiteToMove = !whiteToMove;
  }

  function castle(san: string): void {
    const mine = whiteToMove ? 0 : BLACK;
    const king = whiteToMove ? E1 : E8;
    const long = san.startsWith('O-O-O');
    const rook = long ? king - 4 : king + 3;
    const step = long ? -1 : 1;
    if (board[king] !== (KING | mine) || board[rook] !== (ROOK | mine)) refuse(san);
    for (let square = king + step; square !== rook; square += step) {
      if (board[square] !== EMPTY) refuse(san);
    }

    board[rook] = EMPTY;
    board[king + step] = ROOK | mine;
    move(king, king + 2 * step);
  }

  function pawnMove(san: string, to: number, end: number, promotion: number): void {
    const mine = whiteToMove ? 0 : BLACK;
    const pawn = PAWN | mine;
    const forward = whiteToMove ? 8 : -8;
    let from = to - forward;

    if (end > 2) {
      // A capture: the pawn comes from the file the move begins with, one rank back.
      const sideways = san.charCodeAt(0) - 97 - (to & 7);
      if (sideways !== 1 && sideways !== -1) refuse(san);
      from += sideways;
      if (board[from] !== pawn) refuse(san);
      // Onto an empty square, it took in passing the pawn that stood beside it.
      if (board[to] === EMPTY) {
        if (board[to - forward] !== (PAWN | (mine ^ BLACK))) refuse(san);
        board[to - forward] = EMPTY;
      }
    } else if (board[from] !== pawn) {
      if (board[from] !== EMPTY || board[from - forward] !== pawn) refuse(san);
      from -= forward;
    }

    move(from, to, promotion ? promotion | mine : pawn);
  }

  function pieceMove(san: string, to: number, end: number): void {
    const kind = san.charCodeAt(0);
    const piece = kind | (whiteToMove ? 0 : BLACK);
    // Between the piece's letter and its square a move may say which file or rank it is from.
    let fromFile = -1;
    let fromRank = -1;
    for (let index = 1; index < end - 2; index++) {
      const character = san.charCodeAt(index);
      if (character >= 97 && character <= 104) fromFile = character - 97;
      else if (character >= 49 && character <= 56) fromRank = character - 49;
    }

    found = 0;
    if (kind === KNIGHT || kind === KING) {
      const jumps = kind === KNIGHT ? KNIGHT_JUMPS : LINES;
      for (let jump = 0; jump < 16; jump += 2) {
        const file = (to & 7) + (jumps[jump] as number);
        const rank = (to >> 3) + (jumps[jump + 1] as number);
        if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
          consider(rank * 8 + file, piece, fromFile, fromRank);
        }
      }
    } else if (kind === ROOK) lookAlong(ROOK_LINES, to, piece, fromFile, fromRank);
    else if (kind === BISHOP) lookAlong(BISHOP_LINES, to, piece, fromFile, fromRank);
    else if (kind === QUEEN) lookAlong(QUEEN_LINES, to, piece, fromFile, fromRank);

    let from = candidates[0] as number;
    if (found > 1) {
      let free = 0;
      while (free < found && isPinned(candidates[free] as number, to)) free++;
      if (free === found) refuse(san);
      from = candidates[free] as number;
    } else if (found === 0) {
      refuse(san);
    }
    move(from, to);
  }

  function play(san: string): void {
    if (san.charCodeAt(0) === 79 /* O */) {
      castle(san);
      return;
    }

    // From the end: marks of check and mate, what a pawn became, then the square moved to.
    let end = san.length;
    while (end > 0 && (san.charCodeAt(end - 1) === 43 || san.charCodeAt(end - 1) === 35)) end--;
    let promotion = 0;
    if (san.charCodeAt(end - 2) === 61 /* = */) {
      promotion = san.charCodeAt(end - 1);
      end -= 2;
    }
    const file = san.charCodeAt(end - 2) - 97;
    const rank = san.charCodeAt(end - 1) - 49;
    if (!(file >= 0 && file < 8 && rank >= 0 && rank < 8)) refuse(san);

    const to = rank * 8 + file;
    if (san.charCodeAt(0) >= 97) pawnMove(san, to, end, promotion);
    else pieceMove(san, to, end);
  }

  restart();
  return { play, restart, position };
}
