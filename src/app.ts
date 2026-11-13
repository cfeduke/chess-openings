import './styles/theme.css';
import './app.css';
import { createSoundEffects } from './audio/sound-effects.ts';
import { createBoardView } from './board/board-view.ts';
import { buildCatalog } from './catalog/catalog.ts';
import { featuredOpenings } from './catalog/featured.ts';
import { createSearch } from './catalog/search.ts';
import { buildTimeline } from './chess/timeline.ts';
import { loadOpenings } from './data/load.ts';
import type { DataSource, Opening, OpeningsDataset } from './data/opening.ts';
import { el } from './dom.ts';
import { createPlayer } from './playback/player.ts';
import { hashForOpening, openingIdFromHash } from './routing.ts';
import { delaySetting, mutedSetting } from './settings.ts';
import { createAnnouncer } from './ui/announcer.ts';
import { createCatalog } from './ui/catalog.ts';
import { createMoveList } from './ui/move-list.ts';
import { createOpeningHeader } from './ui/opening-header.ts';
import { bindShortcuts } from './ui/shortcuts.ts';
import { createTransport } from './ui/transport.ts';

interface AppOptions {
  /** Fetches the openings. */
  load?: () => Promise<OpeningsDataset>;
  /** Aborting it removes the listeners the app has put on the page. */
  signal?: AbortSignal;
}

/** The board with nothing chosen: the starting position, and no moves to play. */
const NO_LINE = { san: [], uci: [] };

function credits({ repository, commit }: DataSource): HTMLElement {
  const source = el('a', { href: `https://github.com/${repository}/tree/${commit}` }, repository);
  return el(
    'p',
    { class: 'credits' },
    'Openings from ',
    source,
    ` @ ${commit.slice(0, 7)}, in the public domain. Chess pieces by Colin M.L. Burnett.`,
  );
}

/**
 * Builds the site in `root`. The board and its controls are there at once; the catalog arrives
 * when the openings have been fetched, which is when the returned promise settles.
 */
export async function mountApp(root: HTMLElement, options: AppOptions = {}): Promise<void> {
  const { load = loadOpenings, signal } = options;
  /** The page's title before an opening adds its name to it. */
  const siteTitle = document.title;

  const board = createBoardView();
  const sounds = createSoundEffects({ muted: mutedSetting });
  const player = createPlayer({ board, sound: sounds.play, delay: delaySetting });
  const announcer = createAnnouncer(player);
  const moveList = createMoveList(player);
  const transport = createTransport({
    player,
    sounds,
    onFlip: () => board.setOrientation(board.orientation === 'white' ? 'black' : 'white'),
  });

  /** Puts `opening` on the board, by way of the address. Nothing can be opened until the catalog is. */
  let open = (_opening: Opening) => {};
  const header = createOpeningHeader({ onSelect: (opening) => open(opening) });
  const stage = el(
    'section',
    { class: 'stage', 'aria-label': 'Board' },
    header.element,
    el('div', { class: 'stage__board' }, board.element),
  );
  const catalogPanel = el('aside', { class: 'catalog-panel' });

  const skip = el('button', { type: 'button', class: 'skip-link' }, 'Skip to player controls');
  skip.addEventListener('click', transport.focus);

  // Browsers only let audio start from a user gesture, and may stop it again: wake it on each.
  for (const gesture of ['click', 'keydown'] as const) {
    document.addEventListener(gesture, sounds.wake, { signal });
  }
  bindShortcuts(document, player, signal);

  root.classList.add('app');
  root.replaceChildren(
    skip,
    el(
      'header',
      { class: 'app__header' },
      el('h1', {}, 'Chess Openings'),
      el('p', { class: 'app__tagline' }, 'Learn them by watching them.'),
    ),
    // In reading order: what is being watched, then what there is to choose from.
    el('main', { class: 'app__main' }, stage, moveList.element, catalogPanel),
    transport.element,
    announcer.element,
  );
  player.load(buildTimeline(NO_LINE));

  /** Fetches the openings and brings the catalog to life, or says that it could not. */
  const openCatalog = async (): Promise<void> => {
    catalogPanel.replaceChildren(
      el('p', { class: 'catalog-panel__notice' }, 'Loading the openings…'),
    );

    let dataset: OpeningsDataset;
    try {
      dataset = await load();
    } catch (error) {
      console.error(error);
      const retry = el('button', { type: 'button', class: 'catalog-panel__retry' }, 'Try again');
      retry.addEventListener('click', openCatalog);
      catalogPanel.replaceChildren(
        el(
          'p',
          { class: 'catalog-panel__notice', role: 'alert' },
          'The openings could not be loaded.',
        ),
        retry,
      );
      return;
    }

    const catalog = buildCatalog(dataset.openings);

    /**
     * The address says which opening is on the board; this makes the page agree with it. It is
     * the only way an opening gets there, whether the address changed by a click, the back
     * button or a link.
     */
    const showFromAddress = () => {
      const place = catalog.locate(openingIdFromHash(location.hash) ?? '') ?? null;
      const opening = place?.opening;
      header.show(place);
      catalogView.show(opening ?? null);
      document.title = opening ? `${opening.name} (${opening.eco}) — Chess Openings` : siteTitle;
      player.load(buildTimeline(opening ?? NO_LINE));
      if (!opening) return;

      announcer.introduce(opening);
      player.play();
    };

    open = (opening) => {
      history.pushState(null, '', hashForOpening(opening.id));
      showFromAddress();
      // On a narrow screen the catalog is below the board: bring what was asked for into view.
      stage.scrollIntoView({ block: 'nearest' });
    };

    const catalogView = createCatalog({
      catalog,
      search: createSearch(dataset.openings),
      onSelect: open,
    });
    catalogPanel.replaceChildren(catalogView.element, credits(dataset.source));
    header.suggest(featuredOpenings(catalog));

    window.addEventListener('hashchange', showFromAddress, { signal });
    showFromAddress();
  };

  await openCatalog();
}
