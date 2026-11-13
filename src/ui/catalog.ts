import './catalog.css';
import {
  type Catalog,
  type CatalogCollection,
  type CatalogGroup,
  type CatalogSection,
  lineLabel,
} from '../catalog/catalog.ts';
import type { SearchResult } from '../catalog/search.ts';
import { formatMoveText } from '../chess/san.ts';
import type { Opening } from '../data/opening.ts';
import { el, exclusiveAttribute, revealWithin } from '../dom.ts';

interface CatalogOptions {
  catalog: Catalog;
  search(query: string): SearchResult;
  onSelect(opening: Opening): void;
}

/** The catalog on screen: the collections to browse section by section, or to search. */
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

interface TabRowOptions<T> {
  /** What the tabs are, all together. */
  label: string;
  /** The class of the row; each tab's is the same with `-tab` after it. */
  class: string;
  /** The id of the panel that shows what the chosen tab stands for. */
  controls: string;
  items: T[];
  /** A tab's id and text — and its name, where the text alone would not say enough. */
  about(item: T): { id: string; text: string; name?: string; title: string };
  /** Called with the item of a tab that has been clicked, or reached with the keyboard. */
  onChoose(item: T): void;
}

/**
 * A row of tabs, one for each of `items`. It is one stop in the tab order: the arrow keys, Home
 * and End move along it. Which tab is the chosen one is up to the caller, who says so with `mark`.
 */
function tabRow<T>({
  label,
  class: className,
  controls,
  items,
  about,
  onChoose,
}: TabRowOptions<T>) {
  const tabs = items.map((item) => {
    const { id, text, name, title } = about(item);
    const tab = el(
      'button',
      {
        type: 'button',
        role: 'tab',
        class: `${className}-tab`,
        id,
        'aria-controls': controls,
        title,
      },
      text,
    );
    if (name) tab.setAttribute('aria-label', name);
    tab.addEventListener('click', () => onChoose(item));
    return tab;
  });
  const element = el('div', { class: className, role: 'tablist', 'aria-label': label }, ...tabs);

  element.addEventListener('keydown', (event) => {
    const from = tabs.indexOf(event.target as HTMLButtonElement);
    const to = TAB_KEYS[event.key]?.(from, tabs.length - 1);
    const item = to === undefined ? undefined : items[to];
    if (to === undefined || item === undefined) return;

    event.preventDefault();
    onChoose(item);
    tabs[to]?.focus();
  });

  return {
    element,
    /** Makes the tab of `chosen` the chosen one, and returns its id. */
    mark(chosen: T | undefined): string {
      let id = '';
      tabs.forEach((tab, index) => {
        const isChosen = items[index] === chosen;
        tab.setAttribute('aria-selected', String(isChosen));
        tab.setAttribute('tabindex', isChosen ? '0' : '-1');
        if (isChosen) id = tab.id;
      });
      return id;
    },
  };
}

const count = (openings: number) =>
  `${openings.toLocaleString('en')} ${openings === 1 ? 'opening' : 'openings'}`;

/**
 * A list item with a button for one opening. `label` is what tells it from its neighbours;
 * `unseen` is read out before it, for when the list it is in already shows that part; `source`
 * says which collection it is from, for when that is not the one a visitor would take it for.
 */
function lineItem(opening: Opening, label: string, { unseen = '', source = '' } = {}): HTMLElement {
  const moves = formatMoveText(opening.san);
  const name = el('span', { class: 'line__name' }, label);
  if (unseen) name.prepend(el('span', { class: 'visually-hidden' }, unseen));
  // The button is named by what it shows, so that asking for what is on screen finds it.
  const button = el(
    'button',
    { type: 'button', class: 'line', 'data-opening': opening.id, title: moves },
    el('span', { class: 'line__eco eco-badge' }, opening.eco),
    name,
    ...(source ? [el('span', { class: 'line__source' }, source)] : []),
    el('span', { class: 'line__moves' }, moves),
  );
  return el('li', {}, button);
}

export function createCatalog({ catalog, search, onSelect }: CatalogOptions): CatalogView {
  const { collections } = catalog;
  const [mainCollection] = collections;
  let selected: Opening | null = null;
  const holdMark = exclusiveAttribute('aria-current', 'true');

  /** Puts the mark on every button on screen for the opening on the board, and on no other. */
  const markSelected = () => {
    holdMark(selected ? [...element.querySelectorAll(`.line[data-opening="${selected.id}"]`)] : []);
  };

  // Browsing ------------------------------------------------------------------------------

  /** Shows one section of the collection on show. */
  const panel = el('div', {
    class: 'catalog__panel',
    role: 'tabpanel',
    id: 'section-panel',
    tabindex: 0,
  });
  /** What there is of the collection on show: the tabs of its sections, and the panel. */
  const shelf = el('div', { class: 'catalog__shelf', id: 'collection-panel' });

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
            ...family.lines.map((line) =>
              lineItem(line.opening, lineLabel(line), { unseen: `${family.name}: ` }),
            ),
          ),
        );
      }
    }
    group.toggle.setAttribute('aria-expanded', String(expanded));
    group.body.hidden = !expanded;
  };

  /** What the panel shows of a section: what the section is, and its groups. */
  const pageOf = (collection: CatalogCollection, section: CatalogSection): HTMLElement => {
    const page = el(
      'div',
      { class: 'section' },
      el('h2', { class: 'section__title' }, section.title),
      el('p', { class: 'section__summary' }, section.summary),
    );
    if (section.groups.length === 0) {
      page.append(el('p', { class: 'section__empty' }, 'No openings here.'));
    }

    const list = el('ul', { class: 'groups' });
    for (const group of section.groups) {
      const body = el('div', {
        class: 'group__body',
        id: `group-${collection.id}-${group.id}`,
        hidden: '',
      });
      const toggle = el(
        'button',
        {
          type: 'button',
          class: 'group__toggle',
          'data-group': group.id,
          'aria-expanded': 'false',
          'aria-controls': body.id,
        },
        ...(group.codes ? [el('span', { class: 'group__codes' }, group.codes)] : []),
        el('span', { class: 'group__title' }, group.title),
        el('span', { class: 'group__moves' }, formatMoveText(group.moves)),
        el('span', { class: 'group__count' }, String(group.count)),
      );
      toggle.addEventListener('click', () => setExpanded(group, Boolean(body.hidden)));
      groups.set(group, { toggle, body });
      list.append(el('li', { class: 'group' }, toggle, body));
    }
    page.append(list);
    return page;
  };

  /** Each collection's sections: their tabs, their pages, and the one that was last on show. */
  const shelves = new Map(
    collections.map((collection) => {
      const sectionTabs = tabRow({
        label: collection.sectionsLabel,
        class: 'catalog__sections',
        controls: panel.id,
        items: collection.sections,
        about: ({ id, tab, name, title }) => {
          const inFull = `${name}: ${title}`;
          return {
            id: `section-tab-${collection.id}-${id}`,
            text: tab,
            name: inFull,
            title: inFull,
          };
        },
        onChoose: (section) => turnTo(collection, section),
      });
      const pages = new Map(
        collection.sections.map((section) => [section, pageOf(collection, section)]),
      );
      return [collection, { sectionTabs, pages, current: collection.sections[0] }];
    }),
  );

  /** Shown only when there is a choice to make. */
  const collectionTabs =
    collections.length > 1
      ? tabRow({
          label: 'Collections',
          class: 'catalog__collections',
          controls: shelf.id,
          items: collections,
          about: ({ id, name, title }) => ({ id: `collection-tab-${id}`, text: name, title }),
          onChoose: (collection) => turnTo(collection),
        })
      : null;
  if (collectionTabs) shelf.setAttribute('role', 'tabpanel');

  /** Turns to a collection, and to one of its sections: the one it was left at, unless told. */
  const turnTo = (collection: CatalogCollection, section?: CatalogSection) => {
    const kept = shelves.get(collection);
    if (!kept) return;
    kept.current = section ?? kept.current;

    const collectionTab = collectionTabs?.mark(collection);
    if (collectionTab) shelf.setAttribute('aria-labelledby', collectionTab);
    panel.setAttribute('aria-labelledby', kept.sectionTabs.mark(kept.current));

    // Only what has changed is put in place: taking the panel or its page out of the document,
    // even to put it straight back, would lose how far the panel had been scrolled.
    const page = (kept.current && kept.pages.get(kept.current)) ?? null;
    if (kept.sectionTabs.element.parentNode !== shelf) {
      shelf.replaceChildren(kept.sectionTabs.element, panel);
    }
    if (panel.firstChild !== page) panel.replaceChildren(page ?? '');
  };

  // Search --------------------------------------------------------------------------------

  const searchBox = el('input', {
    type: 'search',
    class: 'catalog__search',
    'aria-label': 'Search openings',
    placeholder: `Search ${count(catalog.count)}`,
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
  const browse = el(
    'div',
    { class: 'catalog__browse' },
    ...(collectionTabs ? [collectionTabs.element] : []),
    shelf,
  );

  const runSearch = () => {
    const query = searchBox.value.trim();
    const found = query ? search(query) : { matches: [], total: 0 };
    results.hidden = !query;
    browse.hidden = !results.hidden;

    if (found.total === 0) status.textContent = `No openings match “${query}”.`;
    else if (found.total === found.matches.length) status.textContent = count(found.total);
    else status.textContent = `Showing the first ${found.matches.length} of ${count(found.total)}`;
    matches.replaceChildren(
      ...found.matches.map((opening) => {
        const from = catalog.locate(opening.id)?.collection;
        const source = from && from !== mainCollection ? from.name : '';
        return lineItem(opening, opening.name, { source });
      }),
    );
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

  if (mainCollection) turnTo(mainCollection);

  return {
    element,

    show(opening) {
      selected = opening;
      const place = opening && catalog.locate(opening.id);
      if (place) {
        turnTo(place.collection, place.section);
        setExpanded(place.group, true);
      }
      markSelected();
      const marked = panel.querySelector('.line[aria-current]');
      if (marked) revealWithin(panel, marked);
    },
  };
}
