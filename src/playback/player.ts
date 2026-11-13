import type { BoardView } from '../board/board-view.ts';
import { moveKind } from '../chess/board.ts';
import { givesCheck } from '../chess/san.ts';
import type { Timeline, TimelineMove } from '../chess/timeline.ts';
import { clamp, clampDelay, DEFAULT_DELAY_MS, type MoveSchedule, scheduleFor } from './schedule.ts';

/**
 * What a moment of the demonstration sounds like. A move that gives check is voiced as its own
 * cue followed by `check`.
 */
export type SoundCue = 'move' | 'capture' | 'castle' | 'check' | 'complete';

/** The part of the board the player drives. */
export type PlayerBoard = Pick<
  BoardView,
  'setPosition' | 'highlight' | 'showArrow' | 'clearAnnotations'
>;

/** Everything an interface needs to know to draw the player. */
export interface PlayerSnapshot {
  playing: boolean;
  /** The moves of the line that is loaded. */
  moves: readonly TimelineMove[];
  /** How many of them have been made: the position of the cursor in the move list. */
  ply: number;
  /** The index of the move being pointed out on the board, before it is made; otherwise null. */
  pending: number | null;
  delayMs: number;
}

/** Plays a line on a board at a steady pace: highlight the piece, draw the arrow, move it. */
export interface Player {
  readonly snapshot: PlayerSnapshot;
  /** Calls `listener` whenever the snapshot changes. Returns a function that stops it. */
  subscribe(listener: (snapshot: PlayerSnapshot) => void): () => void;
  /** Shows the start of `timeline` and waits. */
  load(timeline: Timeline): void;
  /** Plays on from the current position, or from the start if the line is over. */
  play(): void;
  pause(): void;
  toggle(): void;
  /** Makes the next move at once, with its slide and its sound, and pauses. */
  stepForward(): void;
  /** Takes the last move back and pauses. */
  stepBack(): void;
  /**
   * Jumps to the position after `ply` moves, without animation or sound. Playback carries on
   * from there if it was running.
   */
  seek(ply: number): void;
  /** Plays the line from the start. */
  restart(): void;
  /** Sets the delay between moves, effective immediately. */
  setDelay(delayMs: number): void;
}

/**
 * What the player is waiting to do next. The first three are the beats of a move; the last is
 * the end of the line, once the final piece has landed.
 */
type Beat = 'highlight' | 'arrow' | 'move' | 'finish';

/** How long each beat is awaited after the one before it. */
function gapBefore(beat: Beat, { highlightAt, arrowAt, moveAt, slideMs }: MoveSchedule): number {
  switch (beat) {
    case 'highlight':
      return highlightAt;
    case 'arrow':
      return arrowAt - highlightAt;
    case 'move':
      return moveAt - arrowAt;
    case 'finish':
      return slideMs;
  }
}

const EMPTY: Timeline = { positions: [], moves: [] };

export function createPlayer(options: {
  board: PlayerBoard;
  sound?: (cue: SoundCue) => void;
}): Player {
  const { board, sound = () => {} } = options;
  let timeline = EMPTY;
  let ply = 0;
  let delayMs = DEFAULT_DELAY_MS;
  /**
   * The beat being waited for — which is to say, whether the player is playing. Each beat is
   * timed from the one before it rather than from a fixed start, so a timer the browser delivers
   * late (a background tab, a sleeping laptop) delays the rest instead of bunching it up.
   */
  let awaiting:
    | { beat: Beat; gap: number; since: number; timer: ReturnType<typeof setTimeout> }
    | undefined;

  const listeners = new Set<(snapshot: PlayerSnapshot) => void>();
  const snapshot = (): PlayerSnapshot => ({
    playing: awaiting !== undefined,
    moves: timeline.moves,
    ply,
    pending: awaiting?.beat === 'arrow' || awaiting?.beat === 'move' ? ply : null,
    delayMs,
  });
  const changed = () => {
    const current = snapshot();
    for (const listener of listeners) listener(current);
  };

  /** Waits for `beat`. `done` is how much of the wait is already behind us, from 0 to 1. */
  const wait = (beat: Beat, done = 0) => {
    clearTimeout(awaiting?.timer);
    const gap = gapBefore(beat, scheduleFor(delayMs));
    awaiting = {
      beat,
      gap,
      since: performance.now() - done * gap,
      timer: setTimeout(strike, Math.round((1 - done) * gap)),
    };
  };

  const stop = () => {
    clearTimeout(awaiting?.timer);
    awaiting = undefined;
  };

  /** Shows the position after `ply` moves; `slideMs` animates the change. */
  const show = (slideMs = 0) => {
    const position = timeline.positions[ply];
    if (position)
      board.setPosition(position, { lastMove: timeline.moves[ply - 1], durationMs: slideMs });
  };

  /** Makes the next move, with its slide and its sound. */
  const advance = () => {
    const move = timeline.moves[ply];
    if (!move) return;
    ply += 1;
    show(scheduleFor(delayMs).slideMs);
    sound(moveKind(move));
    if (givesCheck(move.san)) sound('check');
  };

  const strike = () => {
    const move = timeline.moves[ply];
    switch (awaiting?.beat) {
      case 'highlight':
        if (move) board.highlight(move.from);
        wait('arrow');
        break;
      case 'arrow':
        if (move)
          board.showArrow(move.from, move.to, { durationMs: scheduleFor(delayMs).arrowDrawMs });
        wait('move');
        return; // Nothing in the snapshot has changed.
      case 'move':
        advance();
        wait(ply < timeline.moves.length ? 'highlight' : 'finish');
        break;
      case 'finish':
        stop();
        sound('complete');
        break;
    }
    changed();
  };

  const play = () => {
    if (awaiting || timeline.moves.length === 0) return;
    if (ply === timeline.moves.length) {
      ply = 0;
      show();
    }
    wait('highlight');
    changed();
  };

  const pause = () => {
    if (!awaiting) return;
    stop();
    board.clearAnnotations();
    changed();
  };

  return {
    get snapshot() {
      return snapshot();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    load(next) {
      stop();
      timeline = next;
      ply = 0;
      show();
      changed();
    },

    play,
    pause,

    toggle() {
      if (awaiting) pause();
      else play();
    },

    stepForward() {
      if (ply === timeline.moves.length) return;
      stop();
      advance();
      changed();
    },

    stepBack() {
      if (ply === 0) return;
      stop();
      ply -= 1;
      show(scheduleFor(delayMs).slideMs);
      changed();
    },

    seek(target) {
      ply = clamp(target, 0, timeline.moves.length);
      show();
      if (awaiting && ply < timeline.moves.length) wait('highlight');
      else stop();
      changed();
    },

    restart() {
      stop();
      ply = 0;
      show();
      play();
    },

    setDelay(next) {
      delayMs = clampDelay(next);
      if (awaiting) {
        // Keep the same place in the wait under way: a third of the way there stays a third.
        const done = clamp((performance.now() - awaiting.since) / awaiting.gap, 0, 1);
        wait(awaiting.beat, done);
      }
      changed();
    },
  };
}
