import './catalog.css';
import type { CatalogGroup, CatalogVolume } from '../catalog/catalog.ts';
import type { SearchResult } from '../catalog/search.ts';
import { formatMoveText } from '../chess/san.ts';
import type { Opening } from '../data/opening.ts';
import { el } from '../dom.ts';
import { ecoRangeLabel } from '../eco/taxonomy.ts';

interface CatalogOptions {
  volumes: CatalogVolume[];
  search(query: string, limit?: number): SearchResult;
  onSelect(opening: Opening): void;
}

/** The catalog on screen: the encyclopaedia to browse volume by volume, or to search. */
export interface CatalogView {
  element: HTMLElement;
  /** Marks `opening` as the one on the board and brings it into view; `null` marks none. */
  show(opening: Opening | null): void;
}

/** How many matches a search lists. */
const MOST_RESULTS = 50;
/** The keys that move between tabs, as offsets; Home and End are handled by name. */
const TAB_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

const count = (openings: number) =>
  `${openings.toLocaleString('en')} ${openings === 1 ? 'opening' : 'openings'}`;

/** A button for one opening. `name` is what tells it from its neighbours in the list. */
function lineButton(opening: Opening, name: string): HTMLElement {
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
    el('span', { class: 'line__eco' }, opening.eco),
    el('span', { class: 'line__name' }, name),
    el('span', { class: 'line__moves' }, moves),
  );
  return el('li', {}, button);
}

export function createCatalog({ volumes, search, onSelect }: CatalogOptions): CatalogView {
  const byId = new Map<string, { opening: Opening; volume: CatalogVolume; group: CatalogGroup }>();
  for (const volume of volumes) {
    for (const group of volume.groups) {
      for (const { opening } of group.families.flatMap((family) => family.lines)) {
        byId.set(opening.id, { opening, volume, group });
      }
    }
  }

  let selected: Opening | null = null;

  // Search --------------------------------------------------------------------------------

  const searchBox = el('input', {
    type: 'search',
    class: 'catalog__search',
    'aria-label': 'Search openings',
    placeholder: `Search ${count(byId.size)}`,
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
  let best: Opening | undefined;

  // Browsing ------------------------------------------------------------------------------

  const tabs = volumes.map(({ volume }) => {
    const name = `Volume ${volume.letter}: ${volume.title}`;
    return el(
      'button',
      {
        type: 'button',
        role: 'tab',
        class: 'catalog__tab',
        id: `volume-tab-${volume.letter}`,
        'aria-controls': 'volume-panel',
        'aria-label': name,
        title: name,
      },
      volume.letter,
    );
  });
  const tabList = el(
    'div',
    { class: 'catalog__tabs', role: 'tablist', 'aria-label': 'ECO volumes' },
    ...tabs,
  );
  const panel = el('div', {
    class: 'catalog__panel',
    role: 'tabpanel',
    id: 'volume-panel',
    tabindex: 0,
  });
  const browse = el('div', { class: 'catalog__browse' }, tabList, panel);

  /** Each volume's page is built when it is first turned to, and kept as it was left. */
  const pages = new Map<CatalogVolume, HTMLElement>();
  const groupToggles = new Map<CatalogGroup, HTMLElement>();

  const buildPage = ({ volume, groups }: CatalogVolume): HTMLElement => {
    const page = el(
      'div',
      { class: 'volume' },
      el('h2', { class: 'volume__title' }, volume.title),
      el('p', { class: 'volume__summary' }, volume.summary),
    );
    if (groups.length === 0) {
      page.append(el('p', { class: 'volume__empty' }, 'No openings in this volume.'));
      return page;
    }

    const list = el('ul', { class: 'groups' });
    for (const entry of groups) {
      const { group } = entry;
      const body = el('div', { class: 'group__body', id: `group-${group.from}`, hidden: '' });
      const toggle = el(
        'button',
        {
          type: 'button',
          class: 'group__toggle',
          'data-group': group.from,
          'aria-expanded': 'false',
          'aria-controls': body.id,
        },
        el('span', { class: 'group__codes' }, ecoRangeLabel(group)),
        el('span', { class: 'group__title' }, group.title),
        el('span', { class: 'group__moves' }, formatMoveText(group.moves)),
        el('span', { class: 'group__count' }, String(entry.count)),
      );
      toggle.addEventListener('click', () =>
        setExpanded(entry, toggle.getAttribute('aria-expanded') !== 'true'),
      );
      groupToggles.set(entry, toggle);
      list.append(el('li', { class: 'group' }, toggle, body));
    }
    page.append(list);
    return page;
  };

  const turnTo = (volume: CatalogVolume) => {
    let page = pages.get(volume);
    if (!page) {
      page = buildPage(volume);
      pages.set(volume, page);
    }
    volumes.forEach((candidate, index) => {
      const chosen = candidate === volume;
      tabs[index]?.setAttribute('aria-selected', String(chosen));
      tabs[index]?.setAttribute('tabindex', chosen ? '0' : '-1');
    });
    panel.setAttribute('aria-labelledby', `volume-tab-${volume.volume.letter}`);
    panel.replaceChildren(page);
  };

  /** Opens or closes a group. Its lines are built the first time it is opened. */
  const setExpanded = (entry: CatalogGroup, expanded: boolean) => {
    const toggle = groupToggles.get(entry);
    const body = toggle?.nextElementSibling as HTMLElement | null;
    if (!toggle || !body) return;

    if (expanded && body.childElementCount === 0) {
      for (const family of entry.families) {
        body.append(
          el('h3', { class: 'family' }, el('span', { class: 'family__name' }, family.name)),
          el(
            'ul',
            { class: 'lines' },
            ...family.lines.map((line) => lineButton(line.opening, line.variation || 'Main line')),
          ),
        );
      }
      markSelected();
    }
    toggle.setAttribute('aria-expanded', String(expanded));
    body.hidden = !expanded;
  };

  /** Puts the mark on every button for the opening on the board, and on no other. */
  const markSelected = () => {
    for (const marked of element.querySelectorAll('.line[aria-current]'))
      marked.removeAttribute('aria-current');
    if (!selected) return;
    for (const button of element.querySelectorAll(`.line[data-opening="${selected.id}"]`)) {
      button.setAttribute('aria-current', 'true');
    }
  };

  const runSearch = () => {
    const query = searchBox.value.trim();
    results.hidden = query === '';
    browse.hidden = !results.hidden;
    if (!query) return;

    const found = search(query, MOST_RESULTS);
    best = found.matches[0];
    if (found.total === 0) status.textContent = `No openings match “${query}”.`;
    else if (found.total > found.matches.length) {
      status.textContent = `Showing the first ${found.matches.length} of ${count(found.total)}`;
    } else status.textContent = count(found.total);
    matches.replaceChildren(...found.matches.map((opening) => lineButton(opening, opening.name)));
    markSelected();
  };

  const element = el(
    'nav',
    { class: 'catalog', 'aria-label': 'Openings' },
    searchBox,
    browse,
    results,
  );

  // Events --------------------------------------------------------------------------------

  element.addEventListener('click', (event) => {
    const target = event.target as Element;
    const line = target.closest<HTMLElement>('.line');
    const chosen = line && byId.get(line.dataset.opening ?? '');
    if (chosen) onSelect(chosen.opening);

    const tab = tabs.indexOf(target.closest('[role="tab"]') as HTMLButtonElement);
    if (volumes[tab]) turnTo(volumes[tab]);
  });

  tabList.addEventListener('keydown', (event) => {
    const from = tabs.indexOf(event.target as HTMLButtonElement);
    let to: number | undefined;
    if (event.key in TAB_STEP)
      to = (from + (TAB_STEP[event.key] as number) + tabs.length) % tabs.length;
    else if (event.key === 'Home') to = 0;
    else if (event.key === 'End') to = tabs.length - 1;
    const volume = to === undefined ? undefined : volumes[to];
    if (to === undefined || !volume) return;

    event.preventDefault();
    turnTo(volume);
    tabs[to]?.focus();
  });

  searchBox.addEventListener('input', runSearch);
  searchBox.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && best && !results.hidden) onSelect(best);
    if (event.key === 'Escape' && searchBox.value) {
      event.preventDefault();
      searchBox.value = '';
      runSearch();
    }
  });

  if (volumes[0]) turnTo(volumes[0]);

  return {
    element,

    show(opening) {
      selected = opening;
      const found = opening && byId.get(opening.id);
      if (found) {
        turnTo(found.volume);
        setExpanded(found.group, true);
      }
      markSelected();
      if (found) panel.querySelector('.line[aria-current]')?.scrollIntoView({ block: 'nearest' });
    },
  };
}
