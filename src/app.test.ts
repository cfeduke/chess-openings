// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STUDY, TWO_APPEARANCES } from '../tests/support/appearances.ts';
import { ITALIAN, NAJDORF, SMALL_DATASET } from '../tests/support/openings.ts';
import { DANISH, PAMPHLET, TWO_ARRANGEMENTS, TWO_COLLECTIONS } from '../tests/support/pamphlet.ts';
import { SMALL_DETAIL, SMALL_STATISTICS } from '../tests/support/statistics.ts';
import { mountApp } from './app.ts';
import type { OpeningsDataset } from './data/opening.ts';
import { hashForOpening } from './routing.ts';
import { appearanceSetting, delaySetting } from './settings.ts';
import type { DetailChunk, MostPlayedData, StatisticsData } from './statistics/data.ts';

let unmount = new AbortController();

/** How the games' statistics fail to come, which is how most of these tests have them. */
const noStatistics = async (): Promise<StatisticsData> => {
  throw new Error('statistics.json: HTTP 404');
};

/**
 * Mounts the app at a URL, with the small book of openings unless a loader is given, and without
 * the statistics of how they are played unless a loader of those is.
 */
function mount(
  hash = '',
  load: () => Promise<OpeningsDataset> = async () => SMALL_DATASET,
  loadStatistics: () => Promise<StatisticsData> = noStatistics,
  loadDetail: (chunk: number) => Promise<DetailChunk> = async () => SMALL_DETAIL,
) {
  history.replaceState(null, '', `/${hash}`);
  const root = document.createElement('div');
  document.body.append(root);
  const ready = mountApp(root, {
    load,
    loadStatistics,
    loadDetail,
    signal: unmount.signal,
    appearances: TWO_APPEARANCES,
    arrangements: TWO_ARRANGEMENTS,
  });
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector);
  return {
    root,
    ready,
    $,
    text: (selector: string) => $(selector)?.textContent,
    cursor: () => $('.move-list [aria-current="step"]')?.textContent,
    squareOf: (piece: string) => $(`.piece[data-piece="${piece}"]`)?.dataset.square,
    /** Browses to the Italian Game and clicks it. */
    chooseItalian() {
      [...root.querySelectorAll<HTMLElement>('[role="tab"]')]
        .find((tab) => tab.textContent === 'C')
        ?.click();
      $('.group__toggle[data-group="C50"]')?.click();
      $(`.line[data-opening="${ITALIAN.id}"]`)?.click();
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  unmount = new AbortController();
  // What index.html gives the page before the app has anything to add.
  document.title = 'Chess Openings — learn by watching';
});

afterEach(() => {
  unmount.abort();
  vi.useRealTimers();
  localStorage.clear();
  document.body.replaceChildren();
});

describe('on arrival', () => {
  it('shows the site’s name and a board set up for a new game, straight away', async () => {
    const { root, ready, text } = mount();

    expect(text('h1')).toBe('Chess Openings');
    expect(root.querySelectorAll('.board .piece')).toHaveLength(32);
    await ready;
  });

  it('says it is fetching the openings, then lists them by volume', async () => {
    const fetching = Promise.withResolvers<OpeningsDataset>();
    const { root, ready, text } = mount('', () => fetching.promise);
    expect(text('.catalog-panel')).toContain('Loading the openings');

    fetching.resolve(SMALL_DATASET);
    await ready;

    expect(root.querySelectorAll('[role="tab"]')).toHaveLength(5);
    expect(text('.catalog-panel')).not.toContain('Loading');
  });

  it('invites a choice, and plays nothing until one is made', async () => {
    const { ready, text, squareOf } = mount();
    await ready;

    vi.advanceTimersByTime(10_000);

    expect(text('.opening h2')).toBe('Choose an opening');
    expect(text('.move-list')).toContain('Choose an opening');
    expect(squareOf('e2')).toBe('e2');
  });
});

describe('choosing an opening from the catalog', () => {
  it('names it above the board, lists its moves, and starts to play it', async () => {
    const { root, ready, text, cursor, squareOf, chooseItalian } = mount();
    await ready;

    chooseItalian();

    expect(text('.opening__family')).toBe('Italian Game');
    expect(text('.opening__eco')).toBe('C50');
    const moves = [...root.querySelectorAll('.move-list .move')].map((move) => move.textContent);
    expect(moves).toEqual(['Start', 'e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);

    vi.advanceTimersByTime(600);
    expect(text('.square--highlight')).toBeDefined();
    vi.advanceTimersByTime(900);
    expect(squareOf('e2')).toBe('e4');
    expect(cursor()).toBe('e4');
  });

  it('puts it in the address, so the page can be bookmarked or shared', async () => {
    const { ready, chooseItalian } = mount();
    await ready;

    chooseItalian();

    expect(location.hash).toBe('#/italian-game');
  });

  it('marks it in the catalog', async () => {
    const { ready, $, chooseItalian } = mount();
    await ready;

    chooseItalian();

    expect($(`.line[data-opening="${ITALIAN.id}"]`)?.getAttribute('aria-current')).toBe('true');
  });

  it('starts it over when it is chosen again', async () => {
    const { ready, cursor, chooseItalian } = mount();
    await ready;
    chooseItalian();
    vi.advanceTimersByTime(3200);
    expect(cursor()).toBe('e5');

    chooseItalian();

    expect(cursor()).toBe('Start');
    vi.advanceTimersByTime(1500);
    expect(cursor()).toBe('e4');
  });
});

describe('arriving by a link to an opening', () => {
  it('opens that opening and plays it', async () => {
    const { ready, text, cursor } = mount(hashForOpening(NAJDORF.id));
    await ready;

    expect(text('.opening__family')).toBe('Sicilian Defense');
    expect(text('.opening__variation')).toBe('Najdorf Variation');
    vi.advanceTimersByTime(1500);
    expect(cursor()).toBe('e4');
  });

  it('finds it in the catalog: its volume, its group, its line', async () => {
    const { root, ready, $ } = mount(hashForOpening(NAJDORF.id));
    await ready;

    const selected = root.querySelector('[role="tab"][aria-selected="true"]');
    expect(selected?.textContent).toBe('B');
    expect($(`.line[data-opening="${NAJDORF.id}"]`)?.getAttribute('aria-current')).toBe('true');
  });

  it('just invites a choice when the link names no opening we have', async () => {
    const { ready, text } = mount('#/no-such-opening');
    await ready;

    expect(text('.opening h2')).toBe('Choose an opening');
  });

  it('follows the address when it changes, as with the back button', async () => {
    const { ready, text } = mount(hashForOpening(NAJDORF.id));
    await ready;

    history.replaceState(null, '', `/${hashForOpening(ITALIAN.id)}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(text('.opening__family')).toBe('Italian Game');

    history.replaceState(null, '', '/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(text('.opening h2')).toBe('Choose an opening');
    expect(text('.move-list')).toContain('Choose an opening');
  });
});

describe('when the openings cannot be fetched', () => {
  it('says so and offers to try again', async () => {
    const load = vi
      .fn<() => Promise<OpeningsDataset>>()
      .mockRejectedValueOnce(new Error('openings.json: HTTP 503'))
      .mockResolvedValueOnce(SMALL_DATASET);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { root, ready, text, $ } = mount('', load);
    await ready;

    expect(text('.catalog-panel [role="alert"]')).toContain('could not be loaded');
    expect(logged).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'openings.json: HTTP 503' }),
    );
    expect(root.querySelectorAll('[role="tab"]')).toHaveLength(0);

    $('.catalog-panel button')?.click();
    await vi.waitFor(() => expect(root.querySelectorAll('[role="tab"]')).toHaveLength(5));

    expect($('.catalog-panel [role="alert"]')).toBeNull();
  });
});

describe('the player', () => {
  it('has its controls, with the delay at a second and a half', async () => {
    const { ready, $ } = mount(hashForOpening(ITALIAN.id));
    await ready;

    expect($('[aria-label="Player controls"] button[aria-label="Pause"]')).not.toBeNull();
    expect($<HTMLInputElement>('input[type="range"]')?.value).toBe('1500');
  });

  it('plays at the delay the visitor chose last time', async () => {
    delaySetting.write(400);
    const { ready, $, cursor } = mount(hashForOpening(ITALIAN.id));
    await ready;

    expect($<HTMLInputElement>('input[type="range"]')?.value).toBe('400');
    vi.advanceTimersByTime(400);
    expect(cursor()).toBe('e4');
  });

  it('ignores a saved delay that is out of range', async () => {
    localStorage.setItem(delaySetting.key, '5');
    const { ready, $ } = mount();
    await ready;

    expect($<HTMLInputElement>('input[type="range"]')?.value).toBe('300');
  });
});

describe('mounted as the site mounts it, with no options', () => {
  it('still answers to the keyboard', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => SMALL_DATASET }));
    history.replaceState(null, '', `/${hashForOpening(ITALIAN.id)}`);
    const root = document.createElement('div');
    document.body.append(root);
    await mountApp(root);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(root.querySelector('.move-list [aria-current="step"]')?.textContent).toBe('e4');
    vi.unstubAllGlobals();
  });
});

describe('for a first-time visitor', () => {
  const offered = (root: HTMLElement) => [
    ...root.querySelectorAll<HTMLElement>('[aria-label="Most played openings"] button'),
  ];

  it('offers the most played openings, and opens the one that is picked', async () => {
    const { root, ready, text, cursor } = mount('', undefined, async () => SMALL_STATISTICS);
    await ready;
    await vi.waitFor(() => expect(offered(root)).not.toHaveLength(0));

    expect(offered(root).map((button) => button.textContent)).toEqual([
      'Slav Defense',
      'Sicilian Defense',
      'Scandinavian Defense',
      'Italian Game',
      'Polish Opening',
    ]);

    offered(root)[3]?.click();

    expect(text('.opening__family')).toBe('Italian Game');
    expect(location.hash).toBe(hashForOpening(ITALIAN.id));
    vi.advanceTimersByTime(1500);
    expect(cursor()).toBe('e4');
  });

  it('offers the first eight of them, where there are more', async () => {
    const ranking = SMALL_STATISTICS.mostPlayed as MostPlayedData;
    const families = Array.from({ length: 4 }, () => ranking.families).flat();
    const { root, ready } = mount('', undefined, async () => ({
      ...SMALL_STATISTICS,
      mostPlayed: { ...ranking, families },
    }));
    await ready;

    await vi.waitFor(() => expect(offered(root)).toHaveLength(8));
  });

  it('arrives at the page of the most played, ahead of the volumes', async () => {
    const { root, ready, text } = mount('', undefined, async () => SMALL_STATISTICS);
    await ready;
    await vi.waitFor(() => expect(root.querySelectorAll('[role="tab"]')).toHaveLength(6));

    expect(text('[role="tab"][aria-selected="true"]')).toBe('Top');
    expect(text('#section-panel h2')).toBe('Most played');
    expect(
      [...root.querySelectorAll('#section-panel .ranking .line__name')].map(
        (name) => name.textContent,
      ),
    ).toEqual([
      'Slav Defense',
      'Sicilian Defense',
      'Scandinavian Defense',
      'Italian Game',
      'Polish Opening',
    ]);
  });

  it('plays an opening chosen from that page', async () => {
    const { root, ready, text, cursor } = mount('', undefined, async () => SMALL_STATISTICS);
    await ready;
    await vi.waitFor(() => expect(root.querySelector('.ranking')).not.toBeNull());

    root.querySelector<HTMLElement>('.ranking [data-opening="italian-game"]')?.click();

    expect(text('.opening__family')).toBe('Italian Game');
    vi.advanceTimersByTime(1500);
    expect(cursor()).toBe('e4');
  });

  it('stays with the opening a link brought, though the page of the most played is there', async () => {
    const { root, ready, text } = mount(
      hashForOpening(NAJDORF.id),
      undefined,
      async () => SMALL_STATISTICS,
    );
    await ready;
    await vi.waitFor(() => expect(root.querySelectorAll('[role="tab"]')).toHaveLength(6));

    expect(text('[role="tab"][aria-selected="true"]')).toBe('B');
    expect(offered(root)).toHaveLength(0);
  });

  it('has neither the page nor anything to offer without the numbers, and opens at volume A', async () => {
    const { root, ready, text } = mount();
    await ready;
    await vi.advanceTimersByTimeAsync(0);

    expect(offered(root)).toHaveLength(0);
    expect(root.querySelector('.opening__classics')).toBeNull();
    expect(root.querySelectorAll('[role="tab"]')).toHaveLength(5);
    expect(text('[role="tab"][aria-selected="true"]')).toBe('A');
  });

  it('does without them too when the numbers say nothing of what is most played', async () => {
    const { mostPlayed: _, ...glance } = SMALL_STATISTICS;
    const { root, ready } = mount('', undefined, async () => glance);
    await ready;
    await vi.waitFor(() =>
      expect(root.querySelector('.credits')?.textContent).toContain('How often'),
    );

    expect(offered(root)).toHaveLength(0);
    expect(root.querySelectorAll('[role="tab"]')).toHaveLength(5);
  });
});

describe('stepping through a family', () => {
  it('opens the next line of the family, and plays it', async () => {
    const { ready, $, text } = mount(hashForOpening(NAJDORF.id));
    await ready;

    $('button[aria-label^="Next line"]')?.click();

    expect(text('.opening__variation')).toBe('Najdorf Variation, English Attack');
    expect(location.hash).toBe('#/sicilian-defense-najdorf-variation-english-attack');
  });
});

describe('for someone who cannot see the board', () => {
  it('announces the opening, then each move as it is made', async () => {
    const { ready, text } = mount(hashForOpening(ITALIAN.id));
    await ready;
    expect(text('.announcer')).toBe('Italian Game, 5 moves');

    vi.advanceTimersByTime(1500);
    expect(text('.announcer')).toBe('1. e4');

    vi.advanceTimersByTime(1500);
    expect(text('.announcer')).toBe('1… e5');
  });

  it('names the opening in the page title, and the site alone when there is none', async () => {
    const { ready } = mount(hashForOpening(NAJDORF.id));
    await ready;
    expect(document.title).toBe('Sicilian Defense: Najdorf Variation (B90) — Chess Openings');

    history.replaceState(null, '', '/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(document.title).toBe('Chess Openings — learn by watching');
  });

  it('puts the board before the moves, and the moves before the catalog, in reading order', async () => {
    const { root, ready } = mount(hashForOpening(ITALIAN.id));
    await ready;

    const regions = [...root.querySelectorAll('.stage, .move-list, .catalog-panel')];
    expect(regions.map((region) => region.className.split(' ')[0])).toEqual([
      'stage',
      'move-list',
      'catalog-panel',
    ]);
  });

  it('has a way past the catalog, straight to the player controls', async () => {
    const { root, ready, $ } = mount(hashForOpening(ITALIAN.id));
    await ready;
    const skip = root.querySelector<HTMLElement>('.skip-link');
    expect(root.firstElementChild).toBe(skip);
    expect(skip?.textContent).toBe('Skip to player controls');

    skip?.click();

    expect(document.activeElement).toBe($('[aria-label="Playback"] .icon-button--primary'));
  });
});

describe('the credits', () => {
  it('say where the openings come from, down to the revision', async () => {
    const { ready, text, $ } = mount();
    await ready;

    expect(text('.credits')).toBe(
      'Openings from lichess-org/chess-openings @ abc1234, in the public domain. ' +
        'Chess pieces by Colin M.L. Burnett.',
    );
    expect($<HTMLAnchorElement>('.credits a')?.href).toBe(
      'https://github.com/lichess-org/chess-openings/tree/abc1234def',
    );
  });

  it('name the source of every collection, each with its own licence', async () => {
    const { root, ready, text } = mount('', async () => TWO_COLLECTIONS);
    await ready;

    expect(text('.credits')).toBe(
      'Openings from lichess-org/chess-openings @ abc1234, in the public domain; ' +
        'from A Pamphlet of Gambits @ 2nd edition, under CC-BY-4.0. ' +
        'Chess pieces by Colin M.L. Burnett.',
    );
    expect(
      [...root.querySelectorAll<HTMLAnchorElement>('.credits a')].map((link) => link.href),
    ).toEqual([
      'https://github.com/lichess-org/chess-openings/tree/abc1234def',
      'https://example.org/pamphlet',
    ]);
  });
});

describe('the credit of a collection that must be attributed', () => {
  const BOOK = {
    collections: [
      ...SMALL_DATASET.collections,
      {
        ...PAMPHLET,
        source: {
          title: 'Chess Opening Theory',
          url: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory',
          author: 'Wikibooks contributors',
          revision: '2026-11-13',
          license: 'CC-BY-SA-4.0',
        },
      },
    ],
  };

  it('names its authors, and its licence in words', async () => {
    const { ready, text } = mount('', async () => BOOK);
    await ready;

    expect(text('.credits')).toBe(
      'Openings from lichess-org/chess-openings @ abc1234, in the public domain; ' +
        'from Chess Opening Theory by Wikibooks contributors @ 2026-11-13, under CC BY-SA 4.0. ' +
        'Chess pieces by Colin M.L. Burnett.',
    );
  });

  it('links to the work and to the licence', async () => {
    const { root, ready } = mount('', async () => BOOK);
    await ready;

    expect(
      [...root.querySelectorAll<HTMLAnchorElement>('.credits a')].map((link) => [
        link.textContent,
        link.href,
      ]),
    ).toEqual([
      [
        'lichess-org/chess-openings',
        'https://github.com/lichess-org/chess-openings/tree/abc1234def',
      ],
      ['Chess Opening Theory', 'https://en.wikibooks.org/wiki/Chess_Opening_Theory'],
      ['CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'],
    ]);
  });
});

describe('with a second collection of openings', () => {
  const selectedTabs = (root: HTMLElement) =>
    [...root.querySelectorAll('[role="tab"][aria-selected="true"]')].map((tab) => tab.textContent);

  it('lists the encyclopaedia first, with the other a tab away', async () => {
    const { root, ready } = mount('', async () => TWO_COLLECTIONS);
    await ready;

    expect(selectedTabs(root)).toEqual(['ECO', 'A']);
    expect(
      [...root.querySelectorAll('[aria-label="Collections"] [role="tab"]')].map(
        (tab) => tab.textContent,
      ),
    ).toEqual(['ECO', 'Pamphlet']);
  });

  it('opens a link to one of its openings: plays it, and finds it in its own collection', async () => {
    const { root, ready, text, cursor, $ } = mount(
      hashForOpening(DANISH.id),
      async () => TWO_COLLECTIONS,
    );
    await ready;

    expect(text('.opening__family')).toBe('Danish Gambit');
    expect(text('.opening__place')).toBe(
      'Chapter 1. e4 · King’s Pawn Gambits › Gambits after 1. e4',
    );
    expect(document.title).toBe('Danish Gambit (C21) — Chess Openings');
    expect($<HTMLAnchorElement>('.opening__more a')?.href).toBe('https://example.org/pamphlet/12');
    expect(selectedTabs(root)).toEqual(['Pamphlet', '1. e4']);
    expect($(`.line[data-opening="${DANISH.id}"]`)?.getAttribute('aria-current')).toBe('true');
    vi.advanceTimersByTime(1500);
    expect(cursor()).toBe('e4');
  });

  it('goes from an opening of one collection to an opening of the other', async () => {
    const { root, ready, text } = mount(hashForOpening(DANISH.id), async () => TWO_COLLECTIONS);
    await ready;

    history.replaceState(null, '', `/${hashForOpening(NAJDORF.id)}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(text('.opening__family')).toBe('Sicilian Defense');
    expect(selectedTabs(root)).toEqual(['ECO', 'B']);
  });
});

describe('the appearance of the board', () => {
  /** Picks an appearance from the dropdown, as a visitor would. */
  const choose = (dropdown: HTMLSelectElement | null, id: string) => {
    if (!dropdown) throw new Error('there is no appearance dropdown');
    dropdown.value = id;
    dropdown.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const DROPDOWN = '[aria-label="Player controls"] select[aria-label="Appearance"]';

  it('is the default one for a first-time visitor, and the dropdown says so', async () => {
    const { ready, $ } = mount();
    await ready;

    expect($<HTMLSelectElement>(DROPDOWN)?.value).toBe('classic');
    expect($('.board')?.dataset.pieces).toBe('cburnett');
    expect($('.board')?.dataset.theme).toBe('brown');
  });

  it('changes as soon as another is chosen, and is remembered', async () => {
    const { ready, $ } = mount(hashForOpening(ITALIAN.id));
    await ready;

    choose($(DROPDOWN), 'study');

    expect($('.board')?.dataset.pieces).toBe(STUDY.pieces.id);
    expect($('.board')?.dataset.theme).toBe(STUDY.board.id);
    expect(appearanceSetting.read()).toBe('study');
  });

  it('is the one the visitor chose last time', async () => {
    appearanceSetting.write('study');
    const { ready, $ } = mount();
    await ready;

    expect($<HTMLSelectElement>(DROPDOWN)?.value).toBe('study');
    expect($('.board')?.dataset.pieces).toBe(STUDY.pieces.id);
  });

  it('is the default one when the one chosen last time is no longer offered', async () => {
    appearanceSetting.write('retired');
    const { ready, $ } = mount();
    await ready;

    expect($<HTMLSelectElement>(DROPDOWN)?.value).toBe('classic');
    expect($('.board')?.dataset.pieces).toBe('cburnett');
  });

  it('is credited to wherever the pieces in use come from', async () => {
    const { ready, $, text } = mount();
    await ready;
    expect(text('.credits')).toContain('Chess pieces by Colin M.L. Burnett.');

    choose($(DROPDOWN), 'study');

    expect(text('.credits')).toContain('Chess pieces by A. Tester.');
    expect(text('.credits')).not.toContain('Burnett');
  });
});

describe('how often the openings are played', () => {
  const said = (root: HTMLElement, id: string) =>
    root.querySelector<HTMLElement>(`.line[data-opening="${id}"] .meter`)?.title;
  const withStatistics = async () => SMALL_STATISTICS;

  it('is asked for at once, along with the openings', () => {
    const load = vi.fn(() => new Promise<OpeningsDataset>(() => {}));
    const loadStatistics = vi.fn(() => new Promise<StatisticsData>(() => {}));

    mount('', load, loadStatistics);

    expect(load).toHaveBeenCalledTimes(1);
    expect(loadStatistics).toHaveBeenCalledTimes(1);
  });

  it('does not keep the catalog waiting: the numbers are put on when they come', async () => {
    const counting = Promise.withResolvers<StatisticsData>();
    const { root, ready } = mount(hashForOpening(ITALIAN.id), undefined, () => counting.promise);
    await ready;

    expect(root.querySelectorAll('[role="tab"]')).toHaveLength(5);
    expect(root.querySelector(`.line[data-opening="${ITALIAN.id}"]`)).not.toBeNull();
    expect(root.querySelectorAll('.meter')).toHaveLength(0);

    counting.resolve(SMALL_STATISTICS);

    await vi.waitFor(() => expect(said(root, ITALIAN.id)).toBe('3.9% of games'));
  });

  it('is on the lines from the start when the numbers come before the openings', async () => {
    const fetching = Promise.withResolvers<OpeningsDataset>();
    const { root, ready } = mount(
      hashForOpening(ITALIAN.id),
      () => fetching.promise,
      withStatistics,
    );
    await Promise.resolve();

    fetching.resolve(SMALL_DATASET);
    await ready;

    await vi.waitFor(() => expect(said(root, ITALIAN.id)).toBe('3.9% of games'));
  });

  it('is still shown when the openings came at the second attempt', async () => {
    const load = vi
      .fn<() => Promise<OpeningsDataset>>()
      .mockRejectedValueOnce(new Error('openings.json: HTTP 503'))
      .mockResolvedValueOnce(SMALL_DATASET);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const loadStatistics = vi.fn(withStatistics);
    const { root, ready, $, chooseItalian } = mount('', load, loadStatistics);
    await ready;

    $('.catalog-panel button')?.click();
    await vi.waitFor(() => expect(root.querySelector('[role="tab"]')).not.toBeNull());
    chooseItalian();

    await vi.waitFor(() => expect(said(root, ITALIAN.id)).toBe('3.9% of games'));
    expect(loadStatistics).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['cannot be fetched', noStatistics],
    ['are not what they should be', async () => ({ collections: [] }) as unknown as StatisticsData],
  ])('leaves the site as it was when the numbers %s', async (_, loadStatistics) => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { root, ready, text, squareOf, chooseItalian } = mount('', undefined, loadStatistics);
    await ready;
    await vi.advanceTimersByTimeAsync(0);

    chooseItalian();
    vi.advanceTimersByTime(1500);

    expect(squareOf('e2')).toBe('e4');
    expect(root.querySelectorAll('.line').length).toBeGreaterThan(0);
    expect(root.querySelectorAll('.meter')).toHaveLength(0);
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(logged).not.toHaveBeenCalled();
    expect(text('.credits')).toBe(
      'Openings from lichess-org/chess-openings @ abc1234, in the public domain. ' +
        'Chess pieces by Colin M.L. Burnett.',
    );
  });

  it('is credited: the database, the month and how many games were counted', async () => {
    const { root, ready, text } = mount('', undefined, withStatistics);
    await ready;

    await vi.waitFor(() =>
      expect(text('.credits')).toBe(
        'Openings from lichess-org/chess-openings @ abc1234, in the public domain. ' +
          'How often each is played: 1,000,000 games of October 2026 from the ' +
          'lichess.org open database, in the public domain. ' +
          'Chess pieces by Colin M.L. Burnett.',
      ),
    );
    expect(
      [...root.querySelectorAll<HTMLAnchorElement>('.credits a')].map((link) => link.href),
    ).toEqual([
      'https://github.com/lichess-org/chess-openings/tree/abc1234def',
      'https://database.lichess.org/',
    ]);
  });
});

describe('the statistics of the opening on the board', () => {
  const withStatistics = async () => SMALL_STATISTICS;
  const panelOf = (root: HTMLElement) => root.querySelector<HTMLElement>('.stats');
  const toggleOf = (root: HTMLElement) => root.querySelector<HTMLElement>('.stats__toggle');
  const headings = (root: HTMLElement) =>
    [...root.querySelectorAll('.stats__body h3')].map((heading) => heading.textContent);

  it('are in a panel beside the board, after the moves, which is shut to begin with', async () => {
    const { root, ready } = mount(hashForOpening(ITALIAN.id), undefined, withStatistics);
    await ready;
    await vi.waitFor(() => expect(panelOf(root)?.hidden).toBe(false));

    expect(toggleOf(root)?.getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector('.move-list')?.compareDocumentPosition(panelOf(root) as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      panelOf(root)?.compareDocumentPosition(root.querySelector('.catalog-panel') as Node),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('have no panel while nothing is chosen, or without the numbers', async () => {
    const arrived = mount('', undefined, withStatistics);
    await arrived.ready;
    await vi.waitFor(() => expect(arrived.root.querySelector('.ranking')).not.toBeNull());
    expect(panelOf(arrived.root)?.hidden).toBe(true);

    const without = mount(hashForOpening(ITALIAN.id));
    await without.ready;
    await vi.advanceTimersByTimeAsync(0);
    expect(panelOf(without.root)?.hidden).toBe(true);
  });

  it('have no panel for an opening the tallies do not know', async () => {
    const { root, ready } = mount(
      hashForOpening('four-knights-game-italian-variation'),
      undefined,
      withStatistics,
    );
    await ready;
    await vi.waitFor(() =>
      expect(root.querySelector('.credits')?.textContent).toContain('How often'),
    );

    expect(panelOf(root)?.hidden).toBe(true);
  });

  it('fetch no detail until the panel is opened, then the one file the opening is in', async () => {
    const loadDetail = vi.fn(async () => SMALL_DETAIL);
    const { root, ready } = mount(
      hashForOpening(ITALIAN.id),
      undefined,
      withStatistics,
      loadDetail,
    );
    await ready;
    await vi.waitFor(() => expect(panelOf(root)?.hidden).toBe(false));
    vi.advanceTimersByTime(5000);
    expect(loadDetail).not.toHaveBeenCalled();

    toggleOf(root)?.click();

    expect(loadDetail).toHaveBeenCalledExactlyOnceWith(0);
    await vi.waitFor(() => expect(headings(root)).toHaveLength(6));
    expect(root.querySelector('.stats__often')?.textContent).toContain('39,000 games');
  });

  it('follow the board to another opening, without fetching a file they already have', async () => {
    const loadDetail = vi.fn(async () => SMALL_DETAIL);
    const { root, ready, text } = mount(
      hashForOpening(ITALIAN.id),
      undefined,
      withStatistics,
      loadDetail,
    );
    await ready;
    await vi.waitFor(() => expect(panelOf(root)?.hidden).toBe(false));
    toggleOf(root)?.click();
    await vi.waitFor(() => expect(headings(root)).toHaveLength(6));

    root.querySelector<HTMLElement>('.stats__moves button')?.click();

    expect(location.hash).toBe(hashForOpening('italian-game-giuoco-pianissimo'));
    expect(text('.opening__variation')).toBe('Giuoco Pianissimo');
    await vi.waitFor(() =>
      expect(root.querySelector('.stats__often')?.textContent).toContain('4,000 games'),
    );
    expect(toggleOf(root)?.getAttribute('aria-expanded')).toBe('true');
    expect(loadDetail).toHaveBeenCalledTimes(1);
  });

  it('go when the opening does', async () => {
    const { root, ready } = mount(hashForOpening(ITALIAN.id), undefined, withStatistics);
    await ready;
    await vi.waitFor(() => expect(panelOf(root)?.hidden).toBe(false));

    history.pushState(null, '', '/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(panelOf(root)?.hidden).toBe(true);
  });

  it('say so, and leave the rest of the site alone, when the detail cannot be had', async () => {
    const { root, ready, squareOf } = mount(
      hashForOpening(ITALIAN.id),
      undefined,
      withStatistics,
      async () => {
        throw new Error('statistics/0.json: HTTP 404');
      },
    );
    await ready;
    await vi.waitFor(() => expect(panelOf(root)?.hidden).toBe(false));

    toggleOf(root)?.click();

    await vi.waitFor(() =>
      expect(root.querySelector('.stats [role="alert"]')?.textContent).toContain(
        'could not be fetched',
      ),
    );
    expect(headings(root)).toEqual(['How often', 'How it goes']);
    vi.advanceTimersByTime(1500);
    expect(squareOf('e2')).toBe('e4');
  });
});
