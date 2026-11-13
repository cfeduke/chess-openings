import type { BoardView } from '../board/board-view.ts';
import { moveKind } from '../chess/board.ts';
import { givesCheck } from '../chess/san.ts';
import type { Timeline, TimelineMove } from '../chess/timeline.ts';
import { clampDelay, DEFAULT_DELAY_MS, type MoveSchedule, scheduleFor } from './schedule.ts';

/** What a moment of the demonstration sounds like. */
export type SoundCue = 'move' | 'capture' | 'castle' | 'check' | 'complete';

/** Everything an interface needs to know to draw the player. */
export interface PlayerSnapshot {
  playing: boolean;
  /** How many moves have been made: the position of the cursor in the move list. */
  ply: number;
  /** How many moves the line has. */
  length: number;
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
  /** Makes the next move at once and pauses. */
  stepForward(): void;
  /** Takes the last move back and pauses. */
  stepBack(): void;
  /** Jumps to the position after `ply` moves; playback carries on from there if it was running. */
  seek(ply: number): void;
  /** Plays the line from the start. */
  restart(): void;
  /** Sets the delay between moves, effective immediately. */
  setDelay(delayMs: number): void;
}

interface PlayerOptions {
  board: Pick<BoardView, 'setPosition' | 'highlight' | 'showArrow' | 'clearAnnotations'>;
  sound?: (cue: SoundCue) => void;
  delayMs?: number;
}

/** The beats of one move, in order. Each is due at a point in the schedule. */
const BEATS = ['highlightAt', 'arrowAt', 'moveAt'] as const satisfies (keyof MoveSchedule)[];

const EMPTY: Timeline = { positions: [], moves: [] };

export function createPlayer({
  board,
  sound = () => {},
  delayMs: initialDelay,
}: PlayerOptions): Player {
  let timeline = EMPTY;
  let playing = false;
  let ply = 0;
  let pending: number | null = null;
  let delayMs = clampDelay(initialDelay ?? DEFAULT_DELAY_MS);

  /** While playing: when the move under way began counting down, and which beat comes next. */
  let countdownFrom = 0;
  let beat = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const listeners = new Set<(snapshot: PlayerSnapshot) => void>();
  const snapshot = (): PlayerSnapshot => ({
    playing,
    ply,
    length: timeline.moves.length,
    pending,
    delayMs,
  });
  const changed = () => {
    const current = snapshot();
    for (const listener of listeners) listener(current);
  };

  /** Shows the position after `ply` moves; `slideMs` animates the change. */
  const show = (slideMs = 0) => {
    const position = timeline.positions[ply];
    if (position)
      board.setPosition(position, { lastMove: timeline.moves[ply - 1], durationMs: slideMs });
  };

  const voice = (move: TimelineMove) => {
    sound(moveKind(move));
    if (givesCheck(move.san)) sound('check');
  };

  const stopTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  /** Waits for the next beat of the move under way. */
  const awaitBeat = () => {
    const due = countdownFrom + scheduleFor(delayMs)[BEATS[beat] as (typeof BEATS)[number]];
    timer = setTimeout(strike, Math.max(0, due - Date.now()));
  };

  const beginCountdown = () => {
    countdownFrom = Date.now();
    beat = 0;
    awaitBeat();
  };

  const strike = () => {
    const move = timeline.moves[ply];
    if (!move) return;
    const { arrowDrawMs, slideMs } = scheduleFor(delayMs);

    if (BEATS[beat] === 'highlightAt') {
      board.highlight(move.from);
      pending = ply;
      changed();
    } else if (BEATS[beat] === 'arrowAt') {
      board.showArrow(move.from, move.to, { durationMs: arrowDrawMs });
    } else {
      ply += 1;
      pending = null;
      show(slideMs);
      voice(move);
      if (ply < timeline.moves.length) {
        beginCountdown();
      } else {
        playing = false;
        timer = setTimeout(() => sound('complete'), slideMs);
      }
      changed();
      return;
    }
    beat += 1;
    awaitBeat();
  };

  /** Stops the clock without touching the board. */
  const halt = () => {
    stopTimer();
    playing = false;
    pending = null;
  };

  const player: Player = {
    get snapshot() {
      return snapshot();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    load(next) {
      halt();
      timeline = next;
      ply = 0;
      show();
      changed();
    },

    play() {
      if (playing || timeline.moves.length === 0) return;
      stopTimer();
      if (ply === timeline.moves.length) {
        ply = 0;
        show();
      }
      playing = true;
      beginCountdown();
      changed();
    },

    pause() {
      if (!playing) return;
      halt();
      board.clearAnnotations();
      changed();
    },

    toggle() {
      if (playing) player.pause();
      else player.play();
    },

    stepForward() {
      const move = timeline.moves[ply];
      if (!move) return;
      halt();
      ply += 1;
      show(scheduleFor(delayMs).slideMs);
      voice(move);
      changed();
    },

    stepBack() {
      if (ply === 0) return;
      halt();
      ply -= 1;
      show(scheduleFor(delayMs).slideMs);
      changed();
    },

    seek(target) {
      stopTimer();
      ply = Math.min(timeline.moves.length, Math.max(0, target));
      pending = null;
      show();
      if (playing && ply < timeline.moves.length) beginCountdown();
      else playing = false;
      changed();
    },

    restart() {
      player.seek(0);
      player.play();
    },

    setDelay(next) {
      const previous = delayMs;
      delayMs = clampDelay(next);
      if (timer !== undefined && playing) {
        // Keep the same place in the move under way: a fifth of the way there stays a fifth.
        const now = Date.now();
        countdownFrom = now - ((now - countdownFrom) / previous) * delayMs;
        stopTimer();
        awaitBeat();
      }
      changed();
    },
  };
  return player;
}
