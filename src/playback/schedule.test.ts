import { describe, expect, it } from 'vitest';
import {
  clampDelay,
  DEFAULT_DELAY_MS,
  MAX_DELAY_MS,
  MIN_DELAY_MS,
  scheduleFor,
} from './schedule.ts';

describe('the delay between moves', () => {
  it('is a second and a half unless the viewer says otherwise', () => {
    expect(DEFAULT_DELAY_MS).toBe(1500);
  });

  it('can be set anywhere from brisk to leisurely', () => {
    expect(MIN_DELAY_MS).toBe(300);
    expect(MAX_DELAY_MS).toBe(5000);
    expect(clampDelay(100)).toBe(300);
    expect(clampDelay(2200)).toBe(2200);
    expect(clampDelay(60_000)).toBe(5000);
  });

  it('falls back to the default when it is not a number at all', () => {
    expect(clampDelay(Number.NaN)).toBe(1500);
  });
});

describe('scheduleFor', () => {
  it('spends the default delay resting, then pointing the move out, then making it', () => {
    expect(scheduleFor(1500)).toEqual({
      highlightAt: 600,
      arrowAt: 975,
      arrowDrawMs: 375,
      moveAt: 1500,
      slideMs: 375,
    });
  });

  it('keeps the same rhythm at any delay', () => {
    expect(scheduleFor(300)).toMatchObject({ highlightAt: 120, arrowAt: 195, moveAt: 300 });
    expect(scheduleFor(5000)).toMatchObject({ highlightAt: 2000, arrowAt: 3250, moveAt: 5000 });
  });

  it('does not let the animations themselves drag at long delays, or vanish at short ones', () => {
    expect(scheduleFor(5000)).toMatchObject({ arrowDrawMs: 450, slideMs: 400 });
    expect(scheduleFor(300)).toMatchObject({ arrowDrawMs: 75, slideMs: 120 });
  });

  it.each([300, 450, 800, 1500, 2600, 5000])(
    'at %d ms: rest, highlight, a fully drawn arrow, then the move — in that order',
    (delayMs) => {
      const { highlightAt, arrowAt, arrowDrawMs, moveAt, slideMs } = scheduleFor(delayMs);

      // The piece from the previous move has landed before the next one is pointed out.
      expect(slideMs).toBeLessThanOrEqual(highlightAt);
      expect(highlightAt).toBeLessThan(arrowAt);
      expect(arrowAt + arrowDrawMs).toBeLessThanOrEqual(moveAt);
      expect(moveAt).toBe(delayMs);
    },
  );
});
