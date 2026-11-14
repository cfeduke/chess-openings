import './styles/theme.css';
import './app.css';
import { createSoundEffects } from './audio/sound-effects.ts';
import { APPEARANCES, type Appearances, appearanceById } from './board/appearance.ts';
import { createBoardView } from './board/board-view.ts';
import { type Arrangement, buildCatalog, fullName } from './catalog/catalog.ts';
import { featuredOpenings } from './catalog/featured.ts';
import { buildTimeline } from './chess/timeline.ts';
import { loadOpenings, loadStatistics } from './data/load.ts';
import type { DataSource, Opening, OpeningsDataset } from './data/opening.ts';
import { el } from './dom.ts';
import { createPlayer } from './playback/player.ts';
import { hashForOpening, openingIdFromHash } from './routing.ts';
import { appearanceSetting, delaySetting, mutedSetting } from './settings.ts';
import type { GamesSource, StatisticsData } from './statistics/data.ts';
import { readStatistics } from './statistics/statistics.ts';
import { createAnnouncer } from './ui/announcer.ts';
import { createCatalog } from './ui/catalog.ts';
import { createMoveList } from './ui/move-list.ts';
import { createOpeningHeader } from './ui/opening-header.ts';
import { bindShortcuts } from './ui/shortcuts.ts';
import { createTransport } from './ui/transport.ts';

interface AppOptions {
  /** Fetches the openings. */
  load?: () => Promise<OpeningsDataset>;
  /** Fetches what lichess's games say of them. The site does without if they do not come. */
  loadStatistics?: () => Promise<StatisticsData>;
  /** Aborting it removes the listeners the app has put on the page. */
  signal?: AbortSignal;
  /** The looks the board can be given, the default first. */
  appearances?: Appearances;
  /** How each collection of openings is laid out, by its id, if not the way the site does it. */
  arrangements?: Record<string, Arrangement>;
}

/** The board with nothing chosen: the starting position, and no moves to play. */
const NO_LINE = { san: [], uci: [] };

/**
 * How the credits put a licence, by its SPDX identifier: in words, and with a link where the
 * licence asks to be pointed to. One not listed is named as it is.
 */
const LICENCES: Record<string, () => (Node | string)[]> = {
  'CC0-1.0': () => ['in the public domain'],
  'CC-BY-SA-4.0': () => [
    'under ',
    el('a', { href: 'https://creativecommons.org/licenses/by-sa/4.0/' }, 'CC BY-SA 4.0'),
  ],
};

const licence = (license: string) => LICENCES[license]?.() ?? [`under ${license}`];

/**
 * Says where the openings of each collection come from and, in `pieceCredit` — which the caller
 * keeps up to date — where the pieces do. Between the two is `gamesCredit`, for the caller to
 * fill if the numbers of how the openings are played arrive.
 */
function credits(
  sources: DataSource[],
  gamesCredit: HTMLElement,
  pieceCredit: HTMLElement,
): HTMLElement {
  const openings = sources.flatMap(({ title, url, author, revision, license }, index) => [
    index === 0 ? 'Openings from ' : '; from ',
    el('a', { href: url }, title),
    `${author ? ` by ${author}` : ''} @ ${revision}, `,
    ...licence(license),
  ]);
  return el(
    'p',
    { class: 'credits' },
    ...openings,
    '. ',
    gamesCredit,
    'Chess pieces ',
    pieceCredit,
    '.',
  );
}

/** A month given as `2026-10`, as it is said: `October 2026`. */
function monthInWords(month: string): string {
  const [year = 0, monthOfYear = 1] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthOfYear - 1)).toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Says which games the numbers of how the openings are played were counted from. */
const gamesCredited = ({ title, url, month, games, license }: GamesSource): (Node | string)[] => [
  `How often each is played: ${games.toLocaleString('en')} games of ${monthInWords(month)} from the `,
  el('a', { href: url }, title),
  ', ',
  ...licence(license),
  '. ',
];

/**
 * Builds the site in `root`. The board and its controls are there at once; the catalog arrives
 * when the openings have been fetched, which is when the returned promise settles.
 */
export async function mountApp(root: HTMLElement, options: AppOptions = {}): Promise<void> {
  const { load = loadOpenings, signal, appearances = APPEARANCES, arrangements } = options;
  // Asked for at once, and waited for by nothing: the site is whole without them, and stays
  // that way if they never come.
  const counted = (options.loadStatistics ?? loadStatistics)().catch(() => undefined);
  /** The page's title before an opening adds its name to it. */
  const siteTitle = document.title;

  const appearance = appearanceById(appearanceSetting.read(), appearances);
  const board = createBoardView({ appearance });
  const pieceCredit = el('span', {}, appearance.pieces.credit);
  const sounds = createSoundEffects({ muted: mutedSetting });
  const player = createPlayer({ board, sound: sounds.play, delay: delaySetting });
  const announcer = createAnnouncer(player);
  const moveList = createMoveList(player);
  const transport = createTransport({
    player,
    sounds,
    onFlip: () => board.setOrientation(board.orientation === 'white' ? 'black' : 'white'),
    appearance: {
      choices: appearances,
      chosen: appearance.id,
      onChoose(id) {
        const chosen = appearanceById(id, appearances);
        board.setAppearance(chosen);
        pieceCredit.textContent = chosen.pieces.credit;
        appearanceSetting.write(chosen.id);
      },
    },
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

    const catalog = buildCatalog(dataset.collections, arrangements);

    /**
     * The address says which opening is on the board; this makes the page agree with it. It is
     * the only way an opening gets there, whether the address changed by a click, the back
     * button or a link.
     */
    const showFromAddress = () => {
      const place = catalog.locate(openingIdFromHash(location.hash) ?? '') ?? null;
      const opening = place?.opening;
      const name = place && fullName(place);
      header.show(place);
      catalogView.show(opening ?? null);
      document.title = opening ? `${name} (${opening.eco}) — Chess Openings` : siteTitle;
      player.load(buildTimeline(opening ?? NO_LINE));
      if (!opening || !name) return;

      announcer.introduce({ name, san: opening.san });
      player.play();
    };

    open = (opening) => {
      history.pushState(null, '', hashForOpening(opening.id));
      showFromAddress();
      // On a narrow screen the catalog is below the board: bring what was asked for into view.
      stage.scrollIntoView({ block: 'nearest' });
    };

    const catalogView = createCatalog({ catalog, onSelect: open });
    const gamesCredit = el('span');
    catalogPanel.replaceChildren(
      catalogView.element,
      credits(
        dataset.collections.map((collection) => collection.source),
        gamesCredit,
        pieceCredit,
      ),
    );
    void counted.then((data) => {
      if (!data) return;
      try {
        const statistics = readStatistics(data, dataset.collections);
        // The credit first: it takes room from the catalog, which then sees to what it shows.
        gamesCredit.replaceChildren(...gamesCredited(statistics.source));
        catalogView.count(statistics.of);
      } catch {
        // Numbers that cannot be read are numbers that did not come.
      }
    });
    header.suggest(featuredOpenings(catalog));

    window.addEventListener('hashchange', showFromAddress, { signal });
    showFromAddress();
  };

  await openCatalog();
}
