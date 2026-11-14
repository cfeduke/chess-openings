import '../styles/theme.css';
import { afterEach, describe, expect, it } from 'vitest';
import { encyclopaedia, opening, SMALL_BOOK } from '../../tests/support/openings.ts';
import { TWO_ARRANGEMENTS, TWO_COLLECTIONS } from '../../tests/support/pamphlet.ts';
import { SMALL_STATISTICS } from '../../tests/support/statistics.ts';
import { buildCatalog } from '../catalog/catalog.ts';
import type { OpeningCollection } from '../data/opening.ts';
import { el } from '../dom.ts';
import { readStatistics } from '../statistics/statistics.ts';
import { createCatalog } from './catalog.ts';

/** As narrow as the page ever makes the catalog: its column on a small laptop. */
const NARROWEST = 260;

/** The catalog in a column of its own, as the page lays it out. */
function mount(collections: OpeningCollection[] = TWO_COLLECTIONS.collections) {
  const view = createCatalog({
    catalog: buildCatalog(collections, TWO_ARRANGEMENTS),
    onSelect: () => {},
  });
  const { element } = view;
  const host = el(
    'div',
    { style: `display: flex; flex-direction: column; width: ${NARROWEST}px; height: 480px` },
    element,
  );
  document.body.append(host);

  const tabs = (label: string) => [
    ...element.querySelectorAll<HTMLElement>(
      `[role="tablist"][aria-label="${label}"] [role="tab"]`,
    ),
  ];
  const tab = (label: string) =>
    [...element.querySelectorAll<HTMLElement>('[role="tab"]')].find(
      (found) => found.textContent === label,
    ) as HTMLElement;
  const box = (found: Element) => found.getBoundingClientRect();
  /** Whether everything in `found` is drawn between the catalog's two edges. */
  const fits = (found: HTMLElement) =>
    box(found).left >= box(host).left - 0.5 &&
    box(found).right <= box(host).right + 0.5 &&
    found.scrollWidth <= found.clientWidth;
  return { view, element, tabs, tab, box, fits };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('the collection tabs in a real browser', () => {
  it('sit side by side in a row above the section tabs', () => {
    const { tabs, box } = mount();
    const [eco, pamphlet] = tabs('Collections') as [HTMLElement, HTMLElement];
    const [volumeA] = tabs('ECO volumes') as [HTMLElement];

    expect(box(eco).top).toBe(box(pamphlet).top);
    expect(box(eco).right).toBeLessThanOrEqual(box(pamphlet).left);
    expect(box(eco).bottom).toBeLessThanOrEqual(box(volumeA).top);
  });

  it('stay inside the catalog at its narrowest, and so do the section tabs under them', () => {
    const { tabs, fits } = mount();

    expect(tabs('Collections').filter((found) => !fits(found))).toEqual([]);
    expect(tabs('ECO volumes').filter((found) => !fits(found))).toEqual([]);
  });

  it('still fit when a search has put a number on each of them', () => {
    const { element, tabs, fits } = mount();
    const search = element.querySelector('input[type="search"]') as HTMLInputElement;

    search.value = 'gambit';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    expect(tabs('Collections').map((found) => found.textContent)).toEqual([
      'ECO 0 matches',
      'Pamphlet 4 matches',
    ]);
    expect(tabs('Collections').filter((found) => !fits(found))).toEqual([]);
  });

  it('show which collection is on show', () => {
    const { tab } = mount();
    const look = (found: HTMLElement) => getComputedStyle(found).backgroundColor;
    const [chosen, other] = [look(tab('ECO')), look(tab('Pamphlet'))];
    expect(chosen).not.toBe(other);

    tab('Pamphlet').click();

    expect(look(tab('Pamphlet'))).toBe(chosen);
    expect(look(tab('ECO'))).toBe(other);
  });

  it('do not look like the section tabs', () => {
    const { tab } = mount();

    expect(getComputedStyle(tab('ECO')).borderRadius).not.toBe(
      getComputedStyle(tab('A')).borderRadius,
    );
  });
});

describe('the section tabs in a real browser', () => {
  it('share the width of the catalog between them, however many there are', () => {
    const { tabs, tab, box } = mount();
    const widths = (label: string) => tabs(label).map((found) => Math.round(box(found).width));

    const five = widths('ECO volumes');
    tab('Pamphlet').click();
    const three = widths('Pamphlet chapters');

    expect(new Set(five).size).toBe(1);
    expect(new Set(three).size).toBe(1);
    expect(three[0]).toBeGreaterThan(five[0] as number);
  });

  it('fit their words inside the catalog at its narrowest', () => {
    const { tabs, tab, fits } = mount();

    tab('Pamphlet').click();

    expect(tabs('Pamphlet chapters').map((found) => found.textContent)).toEqual([
      '1. e4',
      '1. d4',
      '1. c4',
    ]);
    expect(tabs('Pamphlet chapters').filter((found) => !fits(found))).toEqual([]);
  });

  it('are where they were when there is only one collection', () => {
    const { element, tabs, box } = mount([encyclopaedia(SMALL_BOOK)]);
    const search = element.querySelector('input[type="search"]') as HTMLElement;
    const [volumeA] = tabs('ECO volumes') as [HTMLElement];

    expect(box(volumeA).top - box(search).bottom).toBeLessThan(16);
  });
});

describe('the panel in a real browser', () => {
  /** Sixty lines of one family: far more than the panel can show at once. */
  const longFamily = Array.from({ length: 60 }, (_, index) =>
    opening('C50', `Italian Game: Line ${index + 1}`, 'e4 e5 Nf3 Nc6 Bc4'),
  );

  it('starts a section at its top, however far down the last one was left', () => {
    const sicilians = Array.from({ length: 60 }, (_, index) =>
      opening('B20', `Sicilian Defense: Line ${index + 1}`, 'e4 c5'),
    );
    const { view, element, tab } = mount([encyclopaedia([...longFamily, ...sicilians])]);
    const panel = element.querySelector('#section-panel') as HTMLElement;
    view.show(sicilians[0] as (typeof sicilians)[number]);
    view.show(longFamily[0] as (typeof longFamily)[number]);
    panel.scrollTop = 500;
    expect(panel.scrollTop).toBe(500);

    tab('B').click();

    expect(panel.scrollTop).toBe(0);
  });

  it('stays where it was scrolled to when another line already in view is shown', () => {
    const { view, element } = mount([encyclopaedia(longFamily)]);
    const panel = element.querySelector('#section-panel') as HTMLElement;
    view.show(longFamily[0] as (typeof longFamily)[number]);
    const tenth = element.querySelector(`.line[data-opening="${longFamily[9]?.id}"]`);
    tenth?.scrollIntoView({ block: 'start' });
    const scrolledTo = panel.scrollTop;
    expect(scrolledTo).toBeGreaterThan(0);

    view.show(longFamily[10] as (typeof longFamily)[number]);

    expect(panel.scrollTop).toBe(scrolledTo);
  });
});

describe('the meter on a line in a real browser', () => {
  /** The small book with its numbers, and the Sicilians on show. */
  function counted() {
    const collections = [encyclopaedia(SMALL_BOOK)];
    const all = mount(collections);
    all.view.count(readStatistics(SMALL_STATISTICS, collections).of);
    all.tab('B').click();
    for (const toggle of all.element.querySelectorAll<HTMLElement>('.group__toggle')) {
      toggle.click();
    }
    const line = (id: string) =>
      all.element.querySelector(`.line[data-opening="${id}"]`) as HTMLElement;
    const meter = (id: string) => line(id).querySelector('.meter') as HTMLElement;
    const bars = (id: string) => [...meter(id).querySelectorAll<HTMLElement>('.meter__bar')];
    return { ...all, line, meter, bars };
  }

  it('sits at the end of the line, beside its name and moves, inside the line', () => {
    const { line, meter, box } = counted();
    const sicilian = line('sicilian-defense');
    const name = sicilian.querySelector('.line__name') as HTMLElement;
    const moves = sicilian.querySelector('.line__moves') as HTMLElement;

    expect(box(meter('sicilian-defense')).left).toBeGreaterThanOrEqual(box(name).right);
    expect(box(meter('sicilian-defense')).left).toBeGreaterThanOrEqual(box(moves).right);
    expect(box(meter('sicilian-defense')).right).toBeLessThanOrEqual(box(sicilian).right);
    expect(box(meter('sicilian-defense')).top).toBeGreaterThanOrEqual(box(sicilian).top);
    expect(box(meter('sicilian-defense')).bottom).toBeLessThanOrEqual(box(sicilian).bottom);
  });

  it('is five bars side by side, each big enough to see', () => {
    const { bars, box } = counted();
    const drawn = bars('sicilian-defense').map(box);

    expect(drawn).toHaveLength(5);
    for (const [index, bar] of drawn.entries()) {
      expect(bar.width).toBeGreaterThanOrEqual(3);
      expect(bar.height).toBeGreaterThanOrEqual(4);
      if (index > 0) expect(bar.left).toBeGreaterThan((drawn[index - 1] as DOMRect).right);
    }
  });

  it('shows the bars that are lit apart from the ones that are not', () => {
    const { bars } = counted();
    const look = (bar: HTMLElement) =>
      `${getComputedStyle(bar).backgroundColor} ${getComputedStyle(bar).opacity}`;
    const [first, , , fourth, fifth] = bars('sicilian-defense').map(look);

    expect(first).toBe(fourth);
    expect(fifth).not.toBe(fourth);
  });

  it('lines up from one line to the next, whatever each has to say', () => {
    const { meter, box } = counted();

    expect(box(meter('sicilian-defense')).left).toBe(box(meter('scandinavian-defense')).left);
    expect(box(meter('sicilian-defense')).width).toBe(
      box(meter('sicilian-defense-najdorf-variation-english-attack')).width,
    );
  });

  it('keeps the line inside the catalog at its narrowest', () => {
    const { element, fits } = counted();

    expect(
      [...element.querySelectorAll<HTMLElement>('.line')].filter((line) => !fits(line)),
    ).toEqual([]);
  });

  it('takes no room for its words, which are for a screen reader', () => {
    const { meter, box } = counted();
    const words = meter('sicilian-defense').querySelector('.visually-hidden') as HTMLElement;

    expect(box(words).width * box(words).height).toBeLessThanOrEqual(1);
    expect(box(meter('sicilian-defense')).width).toBeLessThan(40);
  });
});
