import './catalog.css';
import type { Catalog, CatalogGroup, CatalogVolume } from '../catalog/catalog.ts';
import type { SearchResult } from '../catalog/search.ts';
import { formatMoveText } from '../chess/san.ts';
import type { Opening } from '../data/opening.ts';
import { el, exclusiveAttribute } from '../dom.ts';
import { ecoRangeLabel } from '../eco/taxonomy.ts';

interface CatalogOptions {
  catalog: Catalog;
  search(query: string): SearchResult;
  onSelect(opening: Opening): void;
}

/** The catalog on screen: the encyclopaedia to browse volume by volume, or to search. */
export interface CatalogView {
  element: HTMLElement;
  /** Marks `opening` as the one on the board and brings it into view; `null` marks none. */
  show(opening: Opening | null): void;
}

/** The keys that move between tabs: where each leads from tab `from`, of tabs `0` to `last`. */
const TAB_KEYS: Record<string, (from: number, last: number) => number> = {
  ArrowLeft: (from, last) => (from === 0 ? last : from - 1),
  ArrowRight: (from, last) => (from === last ? 0 : from + 1),
  Home: () => 0,
  End: (_, last) => last,
};

const count = (openings: number) =>
  `${openings.toLocaleString('en')} ${openings === 1 ? 'opening' : 'openings'}`;

/** A list item with a button for one opening. `name` is what tells it from its neighbours. */
function lineItem(opening: Opening, name: string): HTMLElement {
  const moves = formatMoveText(opening.san);
  const button = el(
    'button',
    {
      type: 'button',
      class: 'line',
      'data-opening': opening.id,
      'aria-label': `${opening.name} (${opening.eco})`,
      title: moves,
    },
    el('span', { class: 'line__eco eco-badge' }, opening.eco),
    el('span', { class: 'line__name' }, name),
    el('span', { class: 'line__moves' }, moves),
  );
  return el('li', {}, button);
}

export function createCatalog({ catalog, search, onSelect }: CatalogOptions): CatalogView {
  const { volumes } = catalog;
  let selected: Opening | null = null;
  const holdMark = exclusiveAttribute('aria-current', 'true');

  /** Puts the mark on every button on screen for the opening on the board, and on no other. */
  const markSelected = () => {
    holdMark(selected ? [...element.querySelectorAll(`.line[data-opening="${selected.id}"]`)] : []);
  };

  // Browsing ------------------------------------------------------------------------------

  const panel = el('div', {
    class: 'catalog__panel',
    role: 'tabpanel',
    id: 'volume-panel',
    tabindex: 0,
  });

  /** The two halves of each group: the header that opens it, and where its lines go. */
  const groups = new Map<CatalogGroup, { toggle: HTMLElement; body: HTMLElement }>();

  /** Opens or closes a group. Its lines are built the first time it is opened. */
  const setExpanded = (entry: CatalogGroup, expanded: boolean) => {
    const group = groups.get(entry);
    if (!group) return;
    if (expanded && group.body.childElementCount === 0) {
      for (const family of entry.families) {
        group.body.append(
          el('h3', { class: 'family' }, el('span', { class: 'family__name' }, family.name)),
          el(
            'ul',
            { class: 'lines' },
            ...family.lines.map((line) => lineItem(line.opening, line.variation || 'Main line')),
          ),
        );
      }
    }
    group.toggle.setAttribute('aria-expanded', String(expanded));
    group.body.hidden = !expanded;
  };

  const pages = new Map(
    volumes.map((entry): [CatalogVolume, HTMLElement] => {
      const page = el(
        'div',
        { class: 'volume' },
        el('h2', { class: 'volume__title' }, entry.volume.title),
        el('p', { class: 'volume__summary' }, entry.volume.summary),
      );
      if (entry.groups.length === 0) {
        page.append(el('p', { class: 'volume__empty' }, 'No openings in this volume.'));
      }

      const list = el('ul', { class: 'groups' });
      for (const group of entry.groups) {
        const body = el('div', {
          class: 'group__body',
          id: `group-${group.group.from}`,
          hidden: '',
        });
        const toggle = el(
          'button',
          {
            type: 'button',
            class: 'group__toggle',
            'data-group': group.group.from,
            'aria-expanded': 'false',
            'aria-controls': body.id,
          },
          el('span', { class: 'group__codes' }, ecoRangeLabel(group.group)),
          el('span', { class: 'group__title' }, group.group.title),
          el('span', { class: 'group__moves' }, formatMoveText(group.group.moves)),
          el('span', { class: 'group__count' }, String(group.count)),
        );
        toggle.addEventListener('click', () => setExpanded(group, Boolean(body.hidden)));
        groups.set(group, { toggle, body });
        list.append(el('li', { class: 'group' }, toggle, body));
      }
      page.append(list);
      return [entry, page];
    }),
  );

  const tabs = volumes.map((entry) => {
    const name = `Volume ${entry.volume.letter}: ${entry.volume.title}`;
    const tab = el(
      'button',
      {
        type: 'button',
        role: 'tab',
        class: 'catalog__tab',
        id: `volume-tab-${entry.volume.letter}`,
        'aria-controls': panel.id,
        'aria-label': name,
        title: name,
      },
      entry.volume.letter,
    );
    tab.addEventListener('click', () => turnTo(entry));
    return tab;
  });
  const tabList = el(
    'div',
    { class: 'catalog__tabs', role: 'tablist', 'aria-label': 'ECO volumes' },
    ...tabs,
  );

  const turnTo = (volume: CatalogVolume) => {
    volumes.forEach((candidate, index) => {
      const chosen = candidate === volume;
      tabs[index]?.setAttribute('aria-selected', String(chosen));
      tabs[index]?.setAttribute('tabindex', chosen ? '0' : '-1');
    });
    panel.setAttribute('aria-labelledby', `volume-tab-${volume.volume.letter}`);
    panel.replaceChildren(pages.get(volume) ?? '');
  };

  tabList.addEventListener('keydown', (event) => {
    const from = tabs.indexOf(event.target as HTMLButtonElement);
    const to = TAB_KEYS[event.key]?.(from, tabs.length - 1);
    const volume = to === undefined ? undefined : volumes[to];
    if (to === undefined || !volume) return;

    event.preventDefault();
    turnTo(volume);
    tabs[to]?.focus();
  });

  // Search --------------------------------------------------------------------------------

  const searchBox = el('input', {
    type: 'search',
    class: 'catalog__search',
    'aria-label': 'Search openings',
    placeholder: `Search ${count(volumes.reduce((sum, volume) => sum + volume.count, 0))}`,
    autocomplete: 'off',
    spellcheck: 'false',
  });
  const status = el('p', { class: 'catalog__status', role: 'status' });
  const matches = el('ul', { class: 'lines' });
  const results = el(
    'div',
    { class: 'catalog__results', role: 'region', 'aria-label': 'Search results', hidden: '' },
    status,
    matches,
  );
  const browse = el('div', { class: 'catalog__browse' }, tabList, panel);

  const runSearch = () => {
    const query = searchBox.value.trim();
    const found = query ? search(query) : { matches: [], total: 0 };
    results.hidden = !query;
    browse.hidden = !results.hidden;

    if (found.total === 0) status.textContent = `No openings match “${query}”.`;
    else if (found.total === found.matches.length) status.textContent = count(found.total);
    else status.textContent = `Showing the first ${found.matches.length} of ${count(found.total)}`;
    matches.replaceChildren(...found.matches.map((opening) => lineItem(opening, opening.name)));
    markSelected();
  };

  searchBox.addEventListener('input', runSearch);
  searchBox.addEventListener('keydown', (event) => {
    // Enter takes the best match: the first in the list, if there is a list.
    if (event.key === 'Enter') matches.querySelector<HTMLElement>('.line')?.click();
    if (event.key === 'Escape' && searchBox.value) {
      event.preventDefault();
      searchBox.value = '';
      runSearch();
    }
  });

  const element = el(
    'nav',
    { class: 'catalog', 'aria-label': 'Openings' },
    searchBox,
    browse,
    results,
  );

  // Lines come and go, so one listener on the catalog answers for all of them.
  element.addEventListener('click', (event) => {
    const line = (event.target as Element).closest<HTMLElement>('.line');
    const chosen = line && catalog.locate(line.dataset.opening ?? '');
    if (chosen) onSelect(chosen.opening);
  });

  if (volumes[0]) turnTo(volumes[0]);

  return {
    element,

    show(opening) {
      selected = opening;
      const place = opening && catalog.locate(opening.id);
      if (place) {
        turnTo(place.volume);
        setExpanded(place.group, true);
      }
      markSelected();
      if (place) panel.querySelector('.line[aria-current]')?.scrollIntoView({ block: 'nearest' });
    },
  };
}
