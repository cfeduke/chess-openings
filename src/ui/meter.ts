import './meter.css';
import { el } from '../dom.ts';
import { describeShare, POPULARITY_STEPS, popularityOf } from '../statistics/popularity.ts';

/**
 * A small meter of how often a line is played, `share` being its share of all games: a bar lit
 * for each step of the scale it reaches. What it shows it also says: in a tooltip, and to a screen
 * reader in words that follow on from what the line is called.
 */
export function popularityMeter(share: number): HTMLElement {
  const steps = popularityOf(share);
  const words = describeShare(share);
  const bars = Array.from({ length: POPULARITY_STEPS }, (_, step) =>
    el('span', { class: step < steps ? 'meter__bar meter__bar--on' : 'meter__bar' }),
  );
  return el(
    'span',
    { class: share > 0 ? 'meter' : 'meter meter--none', title: words },
    el('span', { class: 'meter__bars', 'aria-hidden': 'true' }, ...bars),
    el('span', { class: 'visually-hidden' }, `reached in ${words.replace(/^No/, 'no')}`),
  );
}
