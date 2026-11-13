/** The delay between moves, unless the viewer changes it. */
export const DEFAULT_DELAY_MS = 1500;
export const MIN_DELAY_MS = 300;
export const MAX_DELAY_MS = 5000;

/** A delay within the limits; anything that is not a number becomes the default. */
export function clampDelay(delayMs: number): number {
  if (Number.isNaN(delayMs)) return DEFAULT_DELAY_MS;
  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, delayMs));
}

/**
 * How the time between two moves is spent. Times are milliseconds from the moment the previous
 * move was made (or playback started).
 */
export interface MoveSchedule {
  /** When the piece that will move is highlighted. */
  highlightAt: number;
  /** When the arrow to its destination starts to draw. */
  arrowAt: number;
  /** How long the arrow takes to draw. */
  arrowDrawMs: number;
  /** When the piece moves: the delay itself. */
  moveAt: number;
  /** How long the piece takes to slide to its square. */
  slideMs: number;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * The rhythm is the same at every delay: the board rests while the last move sinks in, the next
 * piece is highlighted, an arrow shows where it will go, and it goes. Only the animations
 * themselves are held within sensible lengths.
 */
export function scheduleFor(delayMs: number): MoveSchedule {
  return {
    highlightAt: Math.round(delayMs * 0.4),
    arrowAt: Math.round(delayMs * 0.65),
    arrowDrawMs: Math.round(Math.min(delayMs * 0.25, 450)),
    moveAt: delayMs,
    slideMs: Math.round(clamp(delayMs * 0.25, 120, 400)),
  };
}
