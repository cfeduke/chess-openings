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
  readonly id: string;
  readonly color: Color;
  readonly type: PieceType;
}

/** Which piece stands on which square. */
export type Position = ReadonlyMap<Square, Piece>;

/** Where a rook starts and ends when its king castles. */
interface RookJourney {
  readonly from: Square;
  readonly to: Square;
}

/** What one move did to the board. */
export interface Move {
  readonly from: Square;
  readonly to: Square;
  /** The piece that moved, as it was before moving. */
  readonly piece: Piece;
  /** The piece taken. Its square differs from `to` only for an en passant capture. */
  readonly captured?: { readonly piece: Piece; readonly square: Square };
  /** The rook's half of a castling move. */
  readonly castle?: RookJourney & { readonly rook: Piece };
  /** What a pawn reaching the last rank became. */
  readonly promotion?: PieceType;
}

const BACK_RANK: [File, PieceType][] = [
  ['a', 'r'],
  ['b', 'n'],
  ['c', 'b'],
  ['d', 'q'],
  ['e', 'k'],
  ['f', 'b'],
  ['g', 'n'],
  ['h', 'r'],
];

export function startingPosition(): Position {
  const position = new Map<Square, Piece>();
  const put = (square: Square, color: Color, type: PieceType) =>
    position.set(square, { id: square, color, type });

  for (const [file, type] of BACK_RANK) {
    put(`${file}1`, 'w', type);
    put(`${file}2`, 'w', 'p');
    put(`${file}7`, 'b', 'p');
    put(`${file}8`, 'b', type);
  }
  return position;
}

const UCI_MOVE = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

/** The king moves that are castling, in UCI, and what the rook does on each. */
const CASTLING: Partial<Record<string, RookJourney>> = {
  e1g1: { from: 'h1', to: 'f1' },
  e1c1: { from: 'a1', to: 'd1' },
  e8g8: { from: 'h8', to: 'f8' },
  e8c8: { from: 'a8', to: 'd8' },
};

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

  // A pawn that changes file onto an empty square has captured en passant: the pawn it took
  // stands beside where it started, not on the square it moved to.
  const enPassant = piece.type === 'p' && from[0] !== to[0] && !position.has(to);
  const capturedOn = enPassant ? (`${to[0]}${from[1]}` as Square) : to;
  const captured = position.get(capturedOn);

  const journey = piece.type === 'k' ? CASTLING[uci] : undefined;
  const rook = journey && position.get(journey.from);

  const next = new Map(position);
  next.delete(capturedOn);
  next.delete(from);
  next.set(to, promotion ? { ...piece, type: promotion } : piece);
  if (rook) {
    next.delete(journey.from);
    next.set(journey.to, rook);
  }

  const move: Move = {
    from,
    to,
    piece,
    captured: captured && { piece: captured, square: capturedOn },
    castle: rook && { rook, ...journey },
    promotion,
  };
  return { position: next, move };
}

/** The broad kind of a move — what a spectator would call it. */
export function moveKind(move: Move): 'move' | 'capture' | 'castle' {
  if (move.castle) return 'castle';
  return move.captured ? 'capture' : 'move';
}
