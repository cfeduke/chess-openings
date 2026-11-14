import './styles/theme.css';
import './app.css';
import { createSoundEffects } from './audio/sound-effects.ts';
import { APPEARANCES, type Appearances, appearanceById } from './board/appearance.ts';
import { createBoardView } from './board/board-view.ts';
import { type Arrangement, buildCatalog, type CatalogPlace, fullName } from './catalog/catalog.ts';
import { buildTimeline } from './chess/timeline.ts';
import { loadDetail, loadOpenings, loadStatistics } from './data/load.ts';
import type { DataSource, Opening, OpeningsDataset } from './data/opening.ts';
import { el } from './dom.ts';
import { createPlayer } from './playback/player.ts';
import { hashForOpening, openingIdFromHash } from './routing.ts';
import { appearanceSetting, delaySetting, mutedSetting } from './settings.ts';
import type { DetailChunk, GamesSource, StatisticsData } from './statistics/data.ts';
import { createDetails } from './statistics/detail.ts';
import { readStatistics, type Statistics } from './statistics/statistics.ts';
import { monthInWords } from './text/month.ts';
import { createAnnouncer } from './ui/announcer.ts';
import { createCatalog } from './ui/catalog.ts';
import { mostPlayedIn, mostPlayedPage } from './ui/most-played.ts';
import { createMoveList } from './ui/move-list.ts';
import { createOpeningHeader } from './ui/opening-header.ts';
import { bindShortcuts } from './ui/shortcuts.ts';
import { createStatisticsPanel } from './ui/statistics-panel.ts';
import { createTransport } from './ui/transport.ts';

interface AppOptions {
  /** Fetches the openings. */
  load?: () => Promise<OpeningsDataset>;
  /** Fetches what lichess's games say of them. The site does without if they do not come. */
  loadStatistics?: () => Promise<StatisticsData>;
  /** Fetches one file of their detail, by its number, when the panel of an opening wants it. */
  loadDetail?: (chunk: number) => Promise<DetailChunk>;
  /** Aborting it removes the listeners the app has put on the page. */
  signal?: AbortSignal;
  /** The looks the board can be given, the default first. */
  appearances?: Appearances;
  /** How each collection of openings is laid out, by its id, if not the way the site does it. */
  arrangements?: Record<string, Arrangement>;
}

/** How many of the most played openings are offered above the board while nothing is chosen. */
const OFFERED = 8;

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
  const panel = createStatisticsPanel({ onSelect: (opening) => open(opening) });
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
    el(
      'main',
      { class: 'app__main' },
      stage,
      el('div', { class: 'side' }, moveList.element, panel.element),
      catalogPanel,
    ),
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
    /** What the games say of the openings, once that has come, and how to have the rest of it. */
    let statistics: Statistics | undefined;
    let detailAt: ReturnType<typeof createDetails> | undefined;

    /** Where the opening the address names is filed, if it names one. */
    const placeNow = () => catalog.locate(openingIdFromHash(location.hash) ?? '') ?? null;

    /** Gives the panel the numbers of the opening at `place`, or puts it away if it has none. */
    const showNumbers = (place: CatalogPlace | null) => {
      const numbers = place && statistics?.of(place.opening);
      if (!place || !statistics || !numbers) {
        panel.show(null);
        return;
      }
      const { total, source, linesAt } = statistics;
      const at = statistics.placeOf(place.opening);
      const fetch = detailAt;
      panel.show({
        numbers,
        total,
        source,
        plies: place.opening.san.length,
        ...(fetch && at !== undefined && { detail: () => fetch(at) }),
        // A line of the collection the opening is in, if it has one that ends there.
        leadsTo(to) {
          const filed = linesAt(to).flatMap((line) => catalog.locate(line.id) ?? []);
          const way = filed.find((found) => found.collection === place.collection) ?? filed[0];
          return way && { opening: way.opening, name: fullName(way) };
        },
      });
    };

    /**
     * The address says which opening is on the board; this makes the page agree with it. It is
     * the only way an opening gets there, whether the address changed by a click, the back
     * button or a link.
     */
    const showFromAddress = () => {
      const place = placeNow();
      const opening = place?.opening;
      const name = place && fullName(place);
      header.show(place);
      showNumbers(place);
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
        statistics = readStatistics(data, dataset.collections);
        detailAt =
          statistics.detail && createDetails(statistics.detail, options.loadDetail ?? loadDetail);
        showNumbers(placeNow());
        // The credit first: it takes room from the catalog, which then sees to what it shows.
        gamesCredit.replaceChildren(...gamesCredited(statistics.source));
        catalogView.count(statistics.of);

        const { mostPlayed: ranking, source } = statistics;
        if (!ranking) return;
        catalogView.lead(ranking.collection, mostPlayedPage({ catalog, ranking, source }));
        header.suggest(mostPlayedIn(catalog, ranking, OFFERED).map(({ place }) => place.opening));
      } catch {
        // Numbers that cannot be read are numbers that did not come.
      }
    });

    window.addEventListener('hashchange', showFromAddress, { signal });
    showFromAddress();
  };

  await openCatalog();
}
