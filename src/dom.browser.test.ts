import { afterEach, describe, expect, it } from 'vitest';
import { el, revealWithin } from './dom.ts';

/** A 100px-tall scrolling box holding twenty 30px rows, far enough down the page to scroll it. */
function setup() {
  const rows = Array.from({ length: 20 }, (_, index) =>
    el('div', { style: 'height: 30px' }, `Row ${index}`),
  );
  const scroller = el('div', { style: 'height: 100px; overflow-y: auto' }, ...rows);
  document.body.append(
    el('div', { style: 'height: 2000px' }),
    scroller,
    el('div', { style: 'height: 2000px' }),
  );
  const visible = (row: HTMLElement) => {
    const box = scroller.getBoundingClientRect();
    const { top, bottom } = row.getBoundingClientRect();
    return top >= box.top - 0.5 && bottom <= box.bottom + 0.5;
  };
  return { scroller, rows, visible };
}

afterEach(() => {
  document.body.replaceChildren();
  window.scrollTo(0, 0);
});

describe('revealWithin', () => {
  it('scrolls the box down just far enough to show something below its edge', () => {
    const { scroller, rows, visible } = setup();
    const row = rows[10] as HTMLElement;
    expect(visible(row)).toBe(false);

    revealWithin(scroller, row);

    expect(visible(row)).toBe(true);
    expect(visible(rows[12] as HTMLElement)).toBe(false);
  });

  it('scrolls back up to show something above its edge', () => {
    const { scroller, rows, visible } = setup();
    scroller.scrollTop = 400;
    const row = rows[2] as HTMLElement;

    revealWithin(scroller, row);

    expect(visible(row)).toBe(true);
    expect(scroller.scrollTop).toBeLessThan(400);
  });

  it('leaves the box alone when the thing is already in view', () => {
    const { scroller, rows } = setup();
    scroller.scrollTop = 45;

    revealWithin(scroller, rows[2] as HTMLElement);

    expect(scroller.scrollTop).toBe(45);
  });

  it('never scrolls the page — unlike scrollIntoView', () => {
    const { scroller, rows } = setup();
    expect(scroller.getBoundingClientRect().top).toBeGreaterThan(window.innerHeight);

    revealWithin(scroller, rows[19] as HTMLElement);

    expect(window.scrollY).toBe(0);
    expect(scroller.scrollTop).toBeGreaterThan(0);
  });
});
