import '../styles/theme.css';
import { afterEach, describe, expect, it } from 'vitest';
import { encyclopaedia, SMALL_BOOK } from '../../tests/support/openings.ts';
import { SMALL_STATISTICS } from '../../tests/support/statistics.ts';
import { buildCatalog } from '../catalog/catalog.ts';
import { el } from '../dom.ts';
import type { MostPlayedData } from '../statistics/data.ts';
import { createCatalog } from './catalog.ts';
import { mostPlayedPage } from './most-played.ts';

/** The catalog's column at its narrowest, on a small laptop, and at its widest, on a phone. */
const WIDTHS = [260, 732];

/** The catalog, `width` wide, with the page of the most played ahead of its volumes. */
function mount(width: number) {
  const catalog = buildCatalog([encyclopaedia(SMALL_BOOK)]);
  const view = createCatalog({ catalog, onSelect: () => {} });
  const page = mostPlayedPage({
    catalog,
    ranking: SMALL_STATISTICS.mostPlayed as MostPlayedData,
    source: SMALL_STATISTICS.source,
  });
  view.lead('eco', page);
  const host = el(
    'div',
    { style: `display: flex; flex-direction: column; width: ${width}px; height: 600px` },
    view.element,
  );
  document.body.append(host);

  const box = (found: Element) => found.getBoundingClientRect();
  const rows = [...page.element.querySelectorAll<HTMLElement>('.ranking .line')];
  const part = (row: HTMLElement, name: string) => row.querySelector(`.${name}`) as HTMLElement;
  return { view, page, host, box, rows, part };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe.each(WIDTHS)('the most played openings in a catalog %i pixels wide', (width) => {
  it('have a tab ahead of the volumes, on the same row and inside the catalog', () => {
    const { host, box } = mount(width);
    const tabs = [...host.querySelectorAll<HTMLElement>('.catalog__sections [role="tab"]')];

    expect(tabs.map((tab) => tab.textContent)).toEqual(['Top', 'A', 'B', 'C', 'D', 'E']);
    for (const tab of tabs) {
      expect(box(tab).top).toBe(box(tabs[0] as HTMLElement).top);
      expect(box(tab).left).toBeGreaterThanOrEqual(box(host).left);
      expect(box(tab).right).toBeLessThanOrEqual(box(host).right);
      expect(tab.scrollWidth).toBeLessThanOrEqual(tab.clientWidth);
    }
  });

  it('are listed one under another, each inside the catalog', () => {
    const { host, rows, box } = mount(width);

    expect(rows).toHaveLength(5);
    for (const [index, row] of rows.entries()) {
      expect(box(row).left).toBeGreaterThanOrEqual(box(host).left);
      expect(box(row).right).toBeLessThanOrEqual(box(host).right);
      expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
      if (index > 0)
        expect(box(row).top).toBeGreaterThanOrEqual(box(rows[index - 1] as HTMLElement).bottom);
    }
  });

  it('have the rank before the name, and the figures after it', () => {
    const { rows, part, box } = mount(width);
    const [slav] = rows as [HTMLElement];
    const rank = box(part(slav, 'ranked__rank'));
    const name = box(part(slav, 'line__name'));
    const moves = box(part(slav, 'line__moves'));
    const share = box(part(slav, 'ranked__share'));
    const meter = box(part(slav, 'meter'));
    const score = box(part(slav, 'ranked__score'));

    expect(rank.right).toBeLessThanOrEqual(name.left);
    expect(moves.top).toBeGreaterThanOrEqual(name.bottom - 1);
    expect(share.left).toBeGreaterThanOrEqual(name.right);
    expect(meter.left).toBeGreaterThanOrEqual(share.right);
    expect(score.left).toBeGreaterThanOrEqual(moves.right);
    expect(score.top).toBeGreaterThanOrEqual(share.bottom - 1);
    for (const figure of [share, meter, score]) {
      expect(figure.right).toBeLessThanOrEqual(box(slav).right);
      expect(figure.width).toBeGreaterThan(0);
    }
  });

  it('line their figures up from one row to the next', () => {
    const { rows, part, box } = mount(width);
    const rights = (name: string) => rows.map((row) => Math.round(box(part(row, name)).right));

    expect(new Set(rights('meter')).size).toBe(1);
    expect(new Set(rights('ranked__score')).size).toBe(1);
    expect(new Set(rows.map((row) => Math.round(box(part(row, 'line__name')).left))).size).toBe(1);
  });

  it('show White’s score whole, on one line', () => {
    const { rows, part, box } = mount(width);

    for (const row of rows) {
      const score = part(row, 'ranked__score');
      expect(score.scrollWidth).toBeLessThanOrEqual(score.clientWidth);
      expect(box(score).height).toBeLessThan(24);
    }
  });

  it('have the choice of players above the list, labelled, and big enough to press', () => {
    const { page, rows, box } = mount(width);
    const players = page.element.querySelector('select') as HTMLSelectElement;
    const label = players.labels?.[0] as HTMLElement;

    expect(box(players).bottom).toBeLessThanOrEqual(box(rows[0] as HTMLElement).top);
    expect(box(label).right).toBeLessThanOrEqual(box(players).left);
    expect(box(players).height).toBeGreaterThanOrEqual(32);
    expect(box(players).right).toBeLessThanOrEqual(box(page.element).right);
  });

  it('can be scrolled to the last of them', () => {
    const { host, rows, box } = mount(width);
    const panel = host.querySelector('#section-panel') as HTMLElement;
    const last = rows.at(-1) as HTMLElement;

    last.scrollIntoView({ block: 'end' });

    expect(box(last).bottom).toBeLessThanOrEqual(box(panel).bottom + 0.5);
    expect(box(last).top).toBeGreaterThanOrEqual(box(panel).top);
  });
});
