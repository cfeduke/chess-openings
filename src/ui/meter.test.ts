// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { popularityMeter } from './meter.ts';

const bars = (meter: HTMLElement) =>
  [...meter.querySelectorAll('.meter__bar')].map((bar) => bar.classList.contains('meter__bar--on'));

describe('popularityMeter', () => {
  it('has five bars, one lit for each factor of ten the share reaches', () => {
    expect(bars(popularityMeter(0.092))).toEqual([true, true, true, true, false]);
    expect(bars(popularityMeter(0.58))).toEqual([true, true, true, true, true]);
    expect(bars(popularityMeter(0.00002))).toEqual([true, false, false, false, false]);
  });

  it('says in words what it shows, for a pointer that rests on it', () => {
    expect(popularityMeter(0.092).title).toBe('9.2% of games');
    expect(popularityMeter(0.00002).title).toBe('1 game in 50,000');
  });

  it('says the same to a screen reader, after whatever it follows', () => {
    const meter = popularityMeter(0.092);

    expect(meter.querySelector('.visually-hidden')?.textContent).toBe(', 9.2% of games');
    expect(meter.querySelector('.meter__bars')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('says so, and lights nothing, when no game reached the line', () => {
    const meter = popularityMeter(0);

    expect(bars(meter)).toEqual([false, false, false, false, false]);
    expect(meter.title).toBe('No games');
    expect(meter.classList.contains('meter--none')).toBe(true);
  });

  it('tells a line reached by very few games from one reached by none', () => {
    const meter = popularityMeter(0.000001);

    expect(bars(meter)).toEqual([false, false, false, false, false]);
    expect(meter.title).toBe('1 game in 1,000,000');
    expect(meter.classList.contains('meter--none')).toBe(false);
  });
});
