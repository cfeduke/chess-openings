// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ITALIAN, NAJDORF, SMALL_DATASET } from '../tests/support/openings.ts';
import { mountApp } from './app.ts';
import type { OpeningsDataset } from './data/opening.ts';
import { hashForOpening } from './routing.ts';
import { delaySetting } from './settings.ts';

let unmount = new AbortController();

/** Mounts the app at a URL, with the small book of openings unless a loader is given. */
async function mount(hash = '', load: () => Promise<OpeningsDataset> = async () => SMALL_DATASET) {
  history.replaceState(null, '', `/${hash}`);
  const root = document.createElement('div');
  document.body.append(root);
  const ready = mountApp(root, { load, signal: unmount.signal });
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
});

afterEach(() => {
  unmount.abort();
  vi.useRealTimers();
  localStorage.clear();
  document.body.replaceChildren();
});

describe('on arrival', () => {
  it('shows the site’s name and a board set up for a new game, straight away', async () => {
    const { root, ready, text } = await mount();

    expect(text('h1')).toBe('Chess Openings');
    expect(root.querySelectorAll('.board .piece')).toHaveLength(32);
    await ready;
  });

  it('says it is fetching the openings, then lists them by volume', async () => {
    const fetching = Promise.withResolvers<OpeningsDataset>();
    const { root, ready, text } = await mount('', () => fetching.promise);
    expect(text('.catalog-panel')).toContain('Loading the openings');

    fetching.resolve(SMALL_DATASET);
    await ready;

    expect(root.querySelectorAll('[role="tab"]')).toHaveLength(5);
    expect(text('.catalog-panel')).not.toContain('Loading');
  });

  it('invites a choice, and plays nothing until one is made', async () => {
    const { ready, text, squareOf } = await mount();
    await ready;

    vi.advanceTimersByTime(10_000);

    expect(text('.opening h2')).toBe('Choose an opening');
    expect(text('.move-list')).toContain('Choose an opening');
    expect(squareOf('e2')).toBe('e2');
  });
});

describe('choosing an opening from the catalog', () => {
  it('names it above the board, lists its moves, and starts to play it', async () => {
    const { root, ready, text, cursor, squareOf, chooseItalian } = await mount();
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
    const { ready, chooseItalian } = await mount();
    await ready;

    chooseItalian();

    expect(location.hash).toBe('#/italian-game');
  });

  it('marks it in the catalog', async () => {
    const { ready, $, chooseItalian } = await mount();
    await ready;

    chooseItalian();

    expect($(`.line[data-opening="${ITALIAN.id}"]`)?.getAttribute('aria-current')).toBe('true');
  });

  it('starts it over when it is chosen again', async () => {
    const { ready, cursor, chooseItalian } = await mount();
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
    const { ready, text, cursor } = await mount(hashForOpening(NAJDORF.id));
    await ready;

    expect(text('.opening__family')).toBe('Sicilian Defense');
    expect(text('.opening__variation')).toBe('Najdorf Variation');
    vi.advanceTimersByTime(1500);
    expect(cursor()).toBe('e4');
  });

  it('finds it in the catalog: its volume, its group, its line', async () => {
    const { root, ready, $ } = await mount(hashForOpening(NAJDORF.id));
    await ready;

    const selected = root.querySelector('[role="tab"][aria-selected="true"]');
    expect(selected?.textContent).toBe('B');
    expect($(`.line[data-opening="${NAJDORF.id}"]`)?.getAttribute('aria-current')).toBe('true');
  });

  it('just invites a choice when the link names no opening we have', async () => {
    const { ready, text } = await mount('#/no-such-opening');
    await ready;

    expect(text('.opening h2')).toBe('Choose an opening');
  });

  it('follows the address when it changes, as with the back button', async () => {
    const { ready, text } = await mount(hashForOpening(NAJDORF.id));
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
    const { root, ready, text, $ } = await mount('', load);
    await ready;

    expect(text('.catalog-panel [role="alert"]')).toContain('could not be loaded');
    expect(root.querySelectorAll('[role="tab"]')).toHaveLength(0);

    $('.catalog-panel button')?.click();
    await vi.waitFor(() => expect(root.querySelectorAll('[role="tab"]')).toHaveLength(5));

    expect($('.catalog-panel [role="alert"]')).toBeNull();
  });
});

describe('the player', () => {
  it('has its controls, with the delay at a second and a half', async () => {
    const { ready, $ } = await mount(hashForOpening(ITALIAN.id));
    await ready;

    expect($('[aria-label="Player controls"] button[aria-label="Pause"]')).not.toBeNull();
    expect($<HTMLInputElement>('input[type="range"]')?.value).toBe('1500');
  });

  it('plays at the delay the visitor chose last time', async () => {
    delaySetting.write(400);
    const { ready, $, cursor } = await mount(hashForOpening(ITALIAN.id));
    await ready;

    expect($<HTMLInputElement>('input[type="range"]')?.value).toBe('400');
    vi.advanceTimersByTime(400);
    expect(cursor()).toBe('e4');
  });

  it('ignores a saved delay that is out of range', async () => {
    localStorage.setItem(delaySetting.key, '5');
    const { ready, $ } = await mount();
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

describe('the credits', () => {
  it('say where the openings come from, down to the revision', async () => {
    const { ready, text, $ } = await mount();
    await ready;

    expect(text('.credits')).toContain('lichess-org/chess-openings');
    expect(text('.credits')).toContain('abc1234');
    expect($<HTMLAnchorElement>('.credits a')?.href).toBe(
      'https://github.com/lichess-org/chess-openings/tree/abc1234def',
    );
  });
});
