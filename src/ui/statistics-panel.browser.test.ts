import '../styles/theme.css';
import '../app.css';
import { afterEach, describe, expect, it } from 'vitest';
import { ITALIAN, NAJDORF } from '../../tests/support/openings.ts';
import { subjectOf } from '../../tests/support/panel.ts';
import { el } from '../dom.ts';
import { createStatisticsPanel } from './statistics-panel.ts';

/** The column beside the board at its narrowest, on a small laptop, and a phone's whole width. */
const WIDTHS = [200, 362];

/** The panel under a list of moves, in a column `width` wide and as tall as the page gives it. */
async function mount(width: number, opening = ITALIAN) {
  const panel = createStatisticsPanel({ onSelect: () => {} });
  const moves = el('section', { class: 'move-list', style: 'min-height: 120px' }, 'Moves');
  const side = el(
    'div',
    { class: 'side', style: `width: ${width}px; height: 560px` },
    moves,
    panel.element,
  );
  document.body.append(side);
  panel.show(subjectOf(opening));

  const toggle = panel.element.querySelector('.stats__toggle') as HTMLButtonElement;
  const body = panel.element.querySelector('.stats__body') as HTMLElement;
  const box = (found: Element) => found.getBoundingClientRect();
  const all = (selector: string) => [...panel.element.querySelectorAll<HTMLElement>(selector)];
  const open = async () => {
    toggle.click();
    await new Promise((resolve) => setTimeout(resolve));
  };
  return { panel, side, moves, toggle, body, box, all, open };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe.each(WIDTHS)('the statistics panel in a column %i pixels wide', (width) => {
  it('is a bar under the moves while it is shut, as wide as they are', async () => {
    const { panel, moves, toggle, body, box } = await mount(width);

    expect(box(panel.element).top).toBeGreaterThanOrEqual(box(moves).bottom);
    expect(box(panel.element).width).toBe(box(moves).width);
    expect(box(panel.element).height).toBeLessThan(60);
    expect(box(toggle).height).toBeGreaterThanOrEqual(40);
    expect(box(body).height).toBe(0);
  });

  it('opens inside its column: the moves keep some room, and it scrolls for the rest', async () => {
    const { panel, side, moves, body, box, open } = await mount(width);

    await open();

    expect(box(panel.element).bottom).toBeLessThanOrEqual(box(side).bottom + 0.5);
    expect(box(moves).height).toBeGreaterThanOrEqual(120);
    expect(box(body).height).toBeGreaterThan(100);
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    expect(getComputedStyle(body).overflowY).toBe('auto');
  });

  it('keeps everything it says between its two edges', async () => {
    const { panel, body, box, all, open } = await mount(width);
    await open();

    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
    const outside = all('.stats__body *').filter(
      (found) =>
        box(found).width > 0 &&
        (box(found).left < box(panel.element).left - 0.5 ||
          box(found).right > box(panel.element).right + 0.5),
    );
    expect(outside.map((found) => found.className || found.tagName)).toEqual([]);
  });

  it('draws the wins, draws and losses as one bar, each part as long as its share', async () => {
    const { all, box, open } = await mount(width);
    await open();
    const [white, draws, black] = all('.stats__part').map(box) as [DOMRect, DOMRect, DOMRect];
    const bar = box(all('.stats__bar')[0] as HTMLElement);

    // End to end, from one edge of the bar to the other, inside its outline.
    expect(Math.abs(white.left - bar.left)).toBeLessThanOrEqual(1.5);
    expect(draws.left).toBeCloseTo(white.right, 0);
    expect(black.left).toBeCloseTo(draws.right, 0);
    expect(Math.abs(black.right - bar.right)).toBeLessThanOrEqual(1.5);
    expect(white.width / bar.width).toBeCloseTo(20_000 / 39_000, 1);
    expect(bar.height).toBeGreaterThanOrEqual(8);
    const looks = all('.stats__part').map((part) => getComputedStyle(part).backgroundColor);
    expect(new Set(looks).size).toBe(3);
  });

  it('sets out each band on a row: what it is, its share with a bar under it, the score', async () => {
    const { all, box, open } = await mount(width);
    await open();
    const [row] = all('.stats__table tbody tr') as [HTMLElement];
    const [name, share, score] = [...row.children].map(box) as [DOMRect, DOMRect, DOMRect];
    const bars = all('.stats__table .stats__share-bar').slice(0, 5).map(box);

    expect(share.left).toBeGreaterThanOrEqual(name.right - 0.5);
    expect(score.left).toBeGreaterThanOrEqual(share.right - 0.5);
    expect(bars[0]?.width).toBeGreaterThan((bars[1] as DOMRect).width);
    expect(bars[1]?.width).toBeGreaterThan((bars[4] as DOMRect).width);
    expect(bars[0]?.height).toBeGreaterThanOrEqual(3);
  });

  it('gives a move that leads to a line a button big enough to press', async () => {
    const { all, box, open } = await mount(width);
    await open();
    const [way] = all('.stats__moves button') as [HTMLElement];

    expect(box(way).height).toBeGreaterThanOrEqual(24);
    expect(box(way).width).toBeGreaterThan(40);
  });

  it('shuts back to a bar', async () => {
    const { panel, toggle, box, open } = await mount(width);
    await open();

    toggle.click();

    expect(box(panel.element).height).toBeLessThan(60);
  });

  it('holds a panel with little to say without stretching it', async () => {
    const { panel, side, body, box, open } = await mount(width, NAJDORF);
    await open();

    expect(box(panel.element).bottom).toBeLessThanOrEqual(box(side).bottom + 0.5);
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
  });
});
