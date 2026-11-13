/**
 * A small model of the board: enough to play through a line that is already known to be legal
 * and say what each move did. It does not generate or validate moves — the dataset build does
 * that once, with a full rules engine.
 */

export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
export type Square = `${File}${Rank}`;

export interface Piece {
  /**
   * The square the piece started the game on. It never changes — not when the piece moves, not
   * when a pawn promotes — so a view can follow one piece through a whole line.
   */
  id: string;
  color: Color;
  type: PieceType;
}

/** Which piece stands on which square. */
export type Position = ReadonlyMap<Square, Piece>;

/** What one move did to the board. */
export interface Move {
  from: Square;
  to: Square;
  /** The piece that moved, as it was before moving. */
  piece: Piece;
  /** The piece taken. Its square differs from `to` only for an en passant capture. */
  captured?: { piece: Piece; square: Square };
  /** The rook's half of a castling move. */
  castle?: { rook: Piece; from: Square; to: Square };
  /** What a pawn reaching the last rank became. */
  promotion?: PieceType;
}

const FILES = [...'abcdefgh'] as File[];
const BACK_RANK = [...'rnbqkbnr'] as PieceType[];

export function startingPosition(): Position {
  const position = new Map<Square, Piece>();
  const put = (square: Square, color: Color, type: PieceType) =>
    position.set(square, { id: square, color, type });

  FILES.forEach((file, index) => {
    put(`${file}1`, 'w', BACK_RANK[index] as PieceType);
    put(`${file}2`, 'w', 'p');
    put(`${file}7`, 'b', 'p');
    put(`${file}8`, 'b', BACK_RANK[index] as PieceType);
  });
  return position;
}

const UCI_MOVE = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

/** Where the rook goes when the king castles to `kingTo`. */
function rookJourney(kingTo: Square): { from: Square; to: Square } {
  const rank = kingTo[1] as Rank;
  return kingTo[0] === 'g'
    ? { from: `h${rank}`, to: `f${rank}` }
    : { from: `a${rank}`, to: `d${rank}` };
}

/**
 * Plays a move written in UCI (`e2e4`, `e7e8q`; castling is the king's two-square move) and
 * returns the resulting position together with a description of what happened.
 */
export function applyMove(position: Position, uci: string): { position: Position; move: Move } {
  const [, from, to, promotion] = (uci.match(UCI_MOVE) ?? []) as [
    string?,
    Square?,
    Square?,
    PieceType?,
  ];
  if (!from || !to) throw new Error(`${JSON.stringify(uci)} is not a UCI move`);

  const piece = position.get(from);
  if (!piece) throw new Error(`no piece on ${from} to play ${uci}`);

  const next = new Map(position);
  const move: Move = { from, to, piece };

  // A pawn that changes file onto an empty square has captured en passant: the pawn it took
  // stands beside where it started, not on the square it moved to.
  const enPassant = piece.type === 'p' && from[0] !== to[0] && !position.has(to);
  const capturedOn: Square = enPassant ? `${to[0] as File}${from[1] as Rank}` : to;
  const captured = position.get(capturedOn);
  if (captured) {
    move.captured = { piece: captured, square: capturedOn };
    next.delete(capturedOn);
  }

  // A king only ever moves two files when castling.
  if (piece.type === 'k' && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2) {
    const journey = rookJourney(to);
    const rook = position.get(journey.from);
    if (!rook) throw new Error(`no rook on ${journey.from} to castle with (${uci})`);
    move.castle = { rook, ...journey };
    next.delete(journey.from);
    next.set(journey.to, rook);
  }

  if (promotion) move.promotion = promotion;
  next.delete(from);
  next.set(to, promotion ? { ...piece, type: promotion } : piece);
  return { position: next, move };
}
