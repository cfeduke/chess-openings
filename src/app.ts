import './styles/theme.css';
import './app.css';
import { createSoundEffects } from './audio/sound-effects.ts';
import { createBoardView } from './board/board-view.ts';
import { buildCatalog } from './catalog/catalog.ts';
import { createSearch } from './catalog/search.ts';
import { buildTimeline } from './chess/timeline.ts';
import { loadOpenings } from './data/load.ts';
import type { DataSource, Opening, OpeningsDataset } from './data/opening.ts';
import { el } from './dom.ts';
import { createPlayer } from './playback/player.ts';
import { hashForOpening, openingIdFromHash } from './routing.ts';
import { delaySetting, mutedSetting } from './settings.ts';
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

  const board = createBoardView();
  const sounds = createSoundEffects({ muted: mutedSetting });
  const player = createPlayer({ board, sound: sounds.play, delay: delaySetting });
  const header = createOpeningHeader();
  const moveList = createMoveList(player);
  const transport = createTransport({
    player,
    sounds,
    onFlip: () => board.setOrientation(board.orientation === 'white' ? 'black' : 'white'),
  });
  const catalogPanel = el('aside', { class: 'catalog-panel' });

  // Browsers only let audio start from a user gesture, and may stop it again: wake it on each.
  for (const gesture of ['click', 'keydown'] as const) {
    document.addEventListener(gesture, sounds.wake, { signal });
  }
  bindShortcuts(document, player, signal);

  root.classList.add('app');
  root.replaceChildren(
    el(
      'header',
      { class: 'app__header' },
      el('h1', {}, 'Chess Openings'),
      el('p', { class: 'app__tagline' }, 'Learn them by watching them.'),
    ),
    el(
      'main',
      { class: 'app__main' },
      catalogPanel,
      el(
        'section',
        { class: 'stage', 'aria-label': 'Board' },
        header.element,
        el('div', { class: 'stage__board' }, board.element),
      ),
      moveList.element,
    ),
    transport.element,
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
    } catch {
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
    if (signal?.aborted) return;

    const byId = new Map(dataset.openings.map((opening) => [opening.id, opening]));

    /** Puts `opening` on the board and plays it; with `null`, clears the board. */
    const show = (opening: Opening | null) => {
      header.show(opening);
      catalog.show(opening);
      player.load(buildTimeline(opening ?? NO_LINE));
      if (opening) player.play();
    };

    const catalog = createCatalog({
      volumes: buildCatalog(dataset.openings),
      search: createSearch(dataset.openings),
      // The address is how a choice is remembered: by the back button, a bookmark, a shared link.
      onSelect(opening) {
        history.pushState(null, '', hashForOpening(opening.id));
        show(opening);
      },
    });
    catalogPanel.replaceChildren(catalog.element, credits(dataset.source));

    const showFromAddress = () => show(byId.get(openingIdFromHash(location.hash) ?? '') ?? null);
    window.addEventListener('hashchange', showFromAddress, { signal });
    showFromAddress();
  };

  await openCatalog();
}
