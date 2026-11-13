// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ITALIAN, NAJDORF, SMALL_BOOK } from '../../tests/support/openings.ts';
import { realOpenings } from '../../tests/support/real-openings.ts';
import { buildCatalog } from '../catalog/catalog.ts';
import { createSearch } from '../catalog/search.ts';
import type { Opening } from '../data/opening.ts';
import { createCatalog } from './catalog.ts';

function setup(openings: Opening[] = SMALL_BOOK) {
  const onSelect = vi.fn();
  const catalog = createCatalog({
    catalog: buildCatalog(openings),
    search: createSearch(openings),
    onSelect,
  });
  const { element } = catalog;
  document.body.append(element);
  const all = <T extends HTMLElement>(selector: string) => [
    ...element.querySelectorAll<T>(selector),
  ];
  const text = (selector: string) => all(selector).map((found) => found.textContent);
  const tab = (letter: string) =>
    all<HTMLButtonElement>('[role="tab"]').find((found) => found.textContent === letter);
  /** The header of the group whose codes start at `from`. */
  const group = (from: string) =>
    element.querySelector<HTMLButtonElement>(`.group__toggle[data-group="${from}"]`);
  const line = (id: string) =>
    element.querySelector<HTMLButtonElement>(`.line[data-opening="${id}"]`);
  const searchBox = element.querySelector('input[type="search"]') as HTMLInputElement;
  const type = (query: string) => {
    searchBox.value = query;
    searchBox.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const press = (target: Element, key: string) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  return { catalog, element, onSelect, all, text, tab, group, line, searchBox, type, press };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('the volume tabs', () => {
  it('are the five volumes of the encyclopaedia', () => {
    const { element, text, all } = setup();

    expect(element.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe(
      'ECO volumes',
    );
    expect(text('[role="tab"]')).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(all('[role="tab"]').map((tab) => tab.getAttribute('aria-label'))).toEqual([
      'Volume A: Flank Openings',
      'Volume B: Semi-Open Games',
      'Volume C: Open Games & French Defense',
      'Volume D: Closed & Semi-Closed Games',
      'Volume E: Indian Defenses',
    ]);
  });

  it('start on volume A, whose panel says what the volume covers', () => {
    const { element, tab } = setup();
    const panel = element.querySelector('[role="tabpanel"]');

    expect(tab('A')?.getAttribute('aria-selected')).toBe('true');
    expect(tab('B')?.getAttribute('aria-selected')).toBe('false');
    expect(panel?.getAttribute('aria-labelledby')).toBe(tab('A')?.id);
    expect(tab('A')?.getAttribute('aria-controls')).toBe(panel?.id);
    expect(panel?.querySelector('h2')?.textContent).toBe('Flank Openings');
    expect(panel?.querySelector('.volume__summary')?.textContent).toContain('English');
  });

  it('switch volume when clicked', () => {
    const { element, tab, text } = setup();

    tab('C')?.click();

    expect(tab('C')?.getAttribute('aria-selected')).toBe('true');
    expect(tab('A')?.getAttribute('aria-selected')).toBe('false');
    expect(element.querySelector('[role="tabpanel"] h2')?.textContent).toBe(
      'Open Games & French Defense',
    );
    expect(text('.group__title')).toEqual(['Italian Game: Giuoco Piano & Evans Gambit']);
  });

  it('are one stop in the tab order, moved through with the arrow keys', () => {
    const { tab, all, press } = setup();
    const stops = () => all('[role="tab"]').map((found) => found.tabIndex);
    expect(stops()).toEqual([0, -1, -1, -1, -1]);

    const used = !press(tab('A') as Element, 'ArrowRight');

    expect(used).toBe(true);
    expect(tab('B')?.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab('B'));
    expect(stops()).toEqual([-1, 0, -1, -1, -1]);

    press(tab('B') as Element, 'ArrowLeft');
    press(tab('A') as Element, 'ArrowLeft');
    expect(tab('E')?.getAttribute('aria-selected')).toBe('true');

    press(tab('E') as Element, 'Home');
    expect(tab('A')?.getAttribute('aria-selected')).toBe('true');

    press(tab('A') as Element, 'End');
    expect(tab('E')?.getAttribute('aria-selected')).toBe('true');
  });

  it('leave other keys alone', () => {
    const { tab, press } = setup();

    expect(press(tab('A') as Element, 'a')).toBe(true);
    expect(tab('A')?.getAttribute('aria-selected')).toBe('true');
  });

  it('say so when a volume has no openings', () => {
    const { element, tab } = setup();

    tab('E')?.click();

    expect(element.querySelector('[role="tabpanel"]')?.textContent).toContain('No openings');
  });
});

describe('the ECO groups of a volume', () => {
  it('each show their codes, title, defining moves and number of lines', () => {
    const { tab, group } = setup();
    tab('B')?.click();

    const najdorf = group('B90');

    expect(najdorf?.querySelector('.group__codes')?.textContent).toBe('B90–B99');
    expect(najdorf?.querySelector('.group__title')?.textContent).toBe('Sicilian Defense: Najdorf');
    expect(najdorf?.querySelector('.group__moves')?.textContent).toBe(
      '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6',
    );
    expect(najdorf?.querySelector('.group__count')?.textContent).toBe('2');
  });

  it('are listed in ECO order, leaving out the ones with nothing in them', () => {
    const { tab, text } = setup();

    tab('B')?.click();

    expect(text('.group__codes')).toEqual(['B01', 'B20–B29', 'B90–B99']);
  });

  it('start closed, with their lines not yet built', () => {
    const { tab, group, all } = setup();
    tab('B')?.click();

    expect(group('B90')?.getAttribute('aria-expanded')).toBe('false');
    expect(all('.line')).toEqual([]);
  });

  it('open to show their families and lines, and close again', () => {
    const { tab, group, element, text } = setup();
    tab('C')?.click();
    const toggle = group('C50') as HTMLButtonElement;
    const body = element.querySelector(`#${toggle.getAttribute('aria-controls')}`) as HTMLElement;

    toggle.click();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(body.hidden).toBe(false);
    expect(text('.family__name')).toEqual(['Italian Game', 'Four Knights Game']);
    expect(text('.line__name')).toEqual(['Main line', 'Giuoco Pianissimo', 'Italian Variation']);

    toggle.click();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(body.hidden).toBe(true);
  });

  it('stay as they were left when you come back to a volume', () => {
    const { tab, group } = setup();
    tab('C')?.click();
    group('C50')?.click();

    tab('A')?.click();
    tab('C')?.click();

    expect(group('C50')?.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('a line', () => {
  it('shows its ECO code, what distinguishes it, and its moves', () => {
    const { tab, group, line } = setup();
    tab('B')?.click();
    group('B90')?.click();

    const english = line('sicilian-defense-najdorf-variation-english-attack');

    expect(english?.querySelector('.line__eco')?.textContent).toBe('B90');
    expect(english?.querySelector('.line__name')?.textContent).toBe(
      'Najdorf Variation, English Attack',
    );
    expect(english?.querySelector('.line__moves')?.textContent).toBe(
      '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3',
    );
    expect(english?.getAttribute('aria-label')).toBe(
      'Sicilian Defense: Najdorf Variation, English Attack (B90)',
    );
  });

  it('is chosen by clicking it', () => {
    const { tab, group, line, onSelect } = setup();
    tab('C')?.click();
    group('C50')?.click();

    line('italian-game')?.click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(ITALIAN);
  });
});

describe('show', () => {
  it('turns to the opening’s volume, opens its group and marks its line', () => {
    const { catalog, tab, group, line, all } = setup();

    catalog.show(NAJDORF);

    expect(tab('B')?.getAttribute('aria-selected')).toBe('true');
    expect(group('B90')?.getAttribute('aria-expanded')).toBe('true');
    expect(line(NAJDORF.id)?.getAttribute('aria-current')).toBe('true');
    expect(all('.line[aria-current]')).toHaveLength(1);
  });

  it('brings the line into view', () => {
    const scrolled = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    const { catalog, line } = setup();

    catalog.show(NAJDORF);

    expect(scrolled).toHaveBeenCalledWith({ block: 'nearest' });
    expect(scrolled.mock.contexts.at(-1)).toBe(line(NAJDORF.id));
    scrolled.mockRestore();
  });

  it('moves the mark when another opening is shown, and removes it for none', () => {
    const { catalog, line, all } = setup();
    catalog.show(NAJDORF);

    catalog.show(ITALIAN);
    expect(line(ITALIAN.id)?.getAttribute('aria-current')).toBe('true');
    expect(all('.line[aria-current]')).toHaveLength(1);

    catalog.show(null);
    expect(all('.line[aria-current]')).toEqual([]);
  });

  it('leaves no mark behind in a volume it has turned away from', () => {
    const { catalog, tab, all } = setup();
    catalog.show(NAJDORF);
    catalog.show(ITALIAN);

    tab('B')?.click();

    expect(all('.line[aria-current]')).toEqual([]);
  });

  it('keeps the mark while its group is closed and opened again', () => {
    const { catalog, group, line } = setup();
    catalog.show(ITALIAN);

    group('C50')?.click();
    group('C50')?.click();

    expect(line(ITALIAN.id)?.getAttribute('aria-current')).toBe('true');
  });
});

describe('search', () => {
  it('has a labelled box that says how much there is to search', () => {
    const { searchBox } = setup();

    expect(searchBox.getAttribute('aria-label')).toBe('Search openings');
    expect(searchBox.placeholder).toBe('Search 9 openings');
  });

  it('replaces the volumes with the matching lines, from every volume', () => {
    const { element, type, text } = setup();

    type('ital');

    expect(element.querySelector<HTMLElement>('.catalog__browse')?.hidden).toBe(true);
    expect(element.querySelector('[role="status"]')?.textContent).toBe('3 openings');
    expect(text('.catalog__results .line__name')).toEqual([
      'Italian Game',
      'Italian Game: Giuoco Pianissimo',
      'Four Knights Game: Italian Variation',
    ]);
  });

  it('finds by ECO code and by moves as well as by name', () => {
    const { type, text } = setup();

    type('b90');
    expect(text('.catalog__results .line__name')).toHaveLength(2);

    type('1. e4 e5 2. Nf3 Nc6 3. Bc4');
    expect(text('.catalog__results .line__name')[0]).toBe('Italian Game');
  });

  it('counts one opening in the singular', () => {
    const { element, type } = setup();

    type('scandinavian');

    expect(element.querySelector('[role="status"]')?.textContent).toBe('1 opening');
  });

  it('says so when nothing matches', () => {
    const { element, type, all } = setup();

    type('zzz');

    expect(element.querySelector('[role="status"]')?.textContent).toBe('No openings match “zzz”.');
    expect(all('.catalog__results .line')).toEqual([]);
  });

  it('chooses a result when it is clicked', () => {
    const { type, line, onSelect } = setup();
    type('najdorf');

    line(NAJDORF.id)?.click();

    expect(onSelect).toHaveBeenCalledWith(NAJDORF);
  });

  it('chooses the best match on Enter', () => {
    const { type, press, searchBox, onSelect } = setup();
    type('najdorf');

    press(searchBox, 'Enter');

    expect(onSelect).toHaveBeenCalledWith(NAJDORF);
  });

  it('chooses nothing on Enter once the box has been emptied', () => {
    const { type, press, searchBox, onSelect } = setup();
    type('najdorf');
    type('');

    press(searchBox, 'Enter');

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('goes back to the volumes when the box is emptied, or on Escape', () => {
    const { element, type, press, searchBox } = setup();
    const browse = element.querySelector('.catalog__browse') as HTMLElement;
    const results = element.querySelector('.catalog__results') as HTMLElement;

    type('ital');
    expect(results.hidden).toBe(false);

    type('');
    expect(browse.hidden).toBe(false);
    expect(results.hidden).toBe(true);

    type('ital');
    press(searchBox, 'Escape');
    expect(searchBox.value).toBe('');
    expect(browse.hidden).toBe(false);
  });

  it('marks the opening on show among the results', () => {
    const { catalog, type, line } = setup();
    catalog.show(NAJDORF);

    type('sicilian');

    expect(line(NAJDORF.id)?.getAttribute('aria-current')).toBe('true');
  });
});

describe('with the whole encyclopaedia', () => {
  it('says how many openings there are to search', () => {
    const { searchBox } = setup(realOpenings);

    expect(searchBox.placeholder).toBe(
      `Search ${realOpenings.length.toLocaleString('en')} openings`,
    );
  });

  it('builds no lines until a group is opened, then only that group’s', () => {
    const { tab, group, all } = setup(realOpenings);
    tab('B')?.click();
    expect(all('.line')).toEqual([]);

    group('B90')?.click();

    const najdorf = realOpenings.filter((opening) => opening.eco >= 'B90' && opening.eco <= 'B99');
    expect(all('.line')).toHaveLength(najdorf.length);
  });

  it('shows only the best of a great many matches, and says so', () => {
    const { element, type, all } = setup(realOpenings);

    type('sicilian');

    expect(all('.catalog__results .line')).toHaveLength(50);
    expect(element.querySelector('[role="status"]')?.textContent).toMatch(
      /^Showing the first 50 of \d{3} openings$/,
    );
  });
});
