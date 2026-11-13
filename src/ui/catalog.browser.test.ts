import '../styles/theme.css';
import { afterEach, describe, expect, it } from 'vitest';
import { encyclopaedia, opening, SMALL_BOOK } from '../../tests/support/openings.ts';
import { TWO_ARRANGEMENTS, TWO_COLLECTIONS } from '../../tests/support/pamphlet.ts';
import { buildCatalog } from '../catalog/catalog.ts';
import { createSearch } from '../catalog/search.ts';
import type { OpeningCollection } from '../data/opening.ts';
import { el } from '../dom.ts';
import { createCatalog } from './catalog.ts';

/** As narrow as the page ever makes the catalog: its column on a small laptop. */
const NARROWEST = 260;

/** The catalog in a column of its own, as the page lays it out. */
function mount(collections: OpeningCollection[] = TWO_COLLECTIONS.collections) {
  const view = createCatalog({
    catalog: buildCatalog(collections, TWO_ARRANGEMENTS),
    search: createSearch(collections.flatMap((collection) => collection.openings)),
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
