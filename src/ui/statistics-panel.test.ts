// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ITALIAN, NAJDORF, SMALL_BOOK } from '../../tests/support/openings.ts';
import { smallDetail, subjectOf } from '../../tests/support/panel.ts';
import type { Opening } from '../data/opening.ts';
import type { OpeningDetail } from '../statistics/detail.ts';
import { createStatisticsPanel } from './statistics-panel.ts';

const named = (name: string) => SMALL_BOOK.find((opening) => opening.name === name) as Opening;
const ENGLISH_ATTACK = named('Sicilian Defense: Najdorf Variation, English Attack');
const PIANISSIMO = named('Italian Game: Giuoco Pianissimo');

function setup() {
  const onSelect = vi.fn();
  const panel = createStatisticsPanel({ onSelect });
  const { element } = panel;
  document.body.append(element);
  const toggle = element.querySelector('.stats__toggle') as HTMLButtonElement;
  const body = element.querySelector('.stats__body') as HTMLElement;
  const text = (selector: string) => element.querySelector(selector)?.textContent;
  const texts = (selector: string) =>
    [...element.querySelectorAll(selector)].map((found) => found.textContent);
  const headings = () => texts('.stats__body h3');
  /** The rows of the table under the heading that says `heading`, cell by cell. */
  const table = (heading: string) =>
    [
      ...([...element.querySelectorAll('.stats__body h3')]
        .find((found) => found.textContent === heading)
        ?.nextElementSibling?.querySelectorAll('tbody tr') ?? []),
    ].map((row) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent));
  /** Lets what has been fetched arrive. */
  const settle = () => new Promise((resolve) => setTimeout(resolve));
  return { panel, element, onSelect, toggle, body, text, texts, headings, table, settle };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('the statistics panel', () => {
  it('is a section of the page, named by the button that opens it', () => {
    const { element, toggle, body } = setup();

    expect(element.tagName).toBe('SECTION');
    expect(element.getAttribute('aria-labelledby')).toBe(toggle.id);
    expect(toggle.textContent).toBe('Statistics');
    expect(toggle.closest('h2')).not.toBeNull();
    expect(toggle.getAttribute('aria-controls')).toBe(body.id);
  });

  it('is not there while there is no opening with numbers to show', () => {
    const { panel, element } = setup();
    expect(element.hidden).toBe(true);

    panel.show(subjectOf(ITALIAN));
    expect(element.hidden).toBe(false);

    panel.show(null);
    expect(element.hidden).toBe(true);
  });

  it('is shut to begin with, and has fetched nothing', () => {
    const { panel, toggle, body } = setup();
    const detail = vi.fn(async () => smallDetail(6));

    panel.show(subjectOf(ITALIAN, detail));

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(body.hidden).toBe(true);
    expect(body.childElementCount).toBe(0);
    expect(detail).not.toHaveBeenCalled();
  });

  it('opens and shuts when its button is clicked', () => {
    const { panel, toggle, body } = setup();
    panel.show(subjectOf(ITALIAN));

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(body.hidden).toBe(false);

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(body.hidden).toBe(true);
  });
});

describe('opened, for an opening with plenty of games', () => {
  async function opened(subject = subjectOf(ITALIAN)) {
    const all = setup();
    all.panel.show(subject);
    all.toggle.click();
    await all.settle();
    return all;
  }

  it('answers in the order a reader would ask', async () => {
    const { headings } = await opened();

    expect(headings()).toEqual([
      'How often',
      'How it goes',
      'Who plays it',
      'At what speed',
      'What is played next',
      'How long',
    ]);
  });

  it('says how many games reached the position, their share, and of which month', async () => {
    const { text } = await opened();

    expect(text('.stats__often')).toBe(
      '39,000 games reached this position: 3.9% of the 1,000,000 counted on lichess in October 2026.',
    );
  });

  it('shows White’s wins, the draws and Black’s wins as one bar in three parts', async () => {
    const { element } = await opened();
    const parts = [...element.querySelectorAll<HTMLElement>('.stats__bar > *')];

    expect(parts.map((part) => part.className)).toEqual([
      'stats__part stats__part--white',
      'stats__part stats__part--draws',
      'stats__part stats__part--black',
    ]);
    expect(parts.map((part) => part.style.flexGrow)).toEqual(['20000', '1000', '18000']);
    expect(element.querySelector('.stats__bar')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('says each part of the bar in figures too, and White’s score', async () => {
    const { texts, text } = await opened();

    expect(texts('.stats__outcomes li')).toEqual([
      'White wins 51.3%',
      'Draws 2.6%',
      'Black wins 46.2%',
    ]);
    expect(text('.stats__score')).toBe('White scores 52.6%.');
  });

  it('sets the score against what the ratings predicted, in a sentence', async () => {
    const { text } = await opened();

    expect(text('.stats__ratings')).toBe(
      'The players’ ratings predicted 50.0% for White, who scored 52.6%: 2.6 points more. ' +
        'Over all games White does 1.5 points better than predicted, ' +
        'so the opening is doing well for White.',
    );
  });

  it('says who plays it: for each band, the share of its games and White’s score there', async () => {
    const { element, table } = await opened();

    expect(
      [...(element.querySelectorAll('.stats__table')[0]?.querySelectorAll('thead th') ?? [])].map(
        (heading) => heading.textContent,
      ),
    ).toEqual(['Rating', 'Reached in', 'White scores']);
    expect(table('Who plays it')).toEqual([
      ['Under 1200', '11%', '57.0%'],
      ['1200–1599', '3.3%', '57.0%'],
      ['1600–1999', '1.7%', '57.0%'],
      ['2000–2399', '1.2%', '57.0%'],
      ['2400 and over', '0.4%', 'too few games'],
    ]);
  });

  it('says at what speed, in the same way', async () => {
    const { element, table } = await opened();

    expect(
      [...(element.querySelectorAll('.stats__table')[1]?.querySelectorAll('thead th') ?? [])].map(
        (heading) => heading.textContent,
      ),
    ).toEqual(['Speed', 'Reached in', 'White scores']);
    expect(table('At what speed')).toEqual([
      ['Bullet', '5%', '57.0%'],
      ['Blitz', '3.3%', '57.0%'],
      ['Rapid', '2.7%', '57.0%'],
      ['Classical', '2.5%', 'too few games'],
    ]);
  });

  it('draws each share as a bar as well, the longest for the largest', async () => {
    const { element } = await opened();
    const bars = [
      ...(element
        .querySelectorAll('.stats__table')[0]
        ?.querySelectorAll<HTMLElement>('.stats__share-bar') ?? []),
    ];

    expect(bars).toHaveLength(5);
    expect(bars[0]?.style.width).toBe('100%');
    expect(Number.parseFloat(bars[1]?.style.width ?? '')).toBeCloseTo(30.3, 1);
    expect(bars.every((bar) => bar.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('lists the moves played next, numbered, each with its share of the position’s games', async () => {
    const { texts } = await opened();

    expect(texts('.stats__moves .stats__move')).toEqual([
      '3… Bc5',
      '3… Nf6',
      '3… Be7',
      '3… h6',
      'Other moves',
    ]);
    expect(texts('.stats__moves .stats__move-share')).toEqual([
      '51%',
      '31%',
      '10%',
      '5.1%',
      '2.6%',
    ]);
  });

  it('numbers a move of White’s as White’s', async () => {
    const { texts } = await opened(
      subjectOf(named('Scandinavian Defense'), async () => smallDetail(6)),
    );

    expect(texts('.stats__moves .stats__move')[0]).toBe('2. Bc5');
  });

  it('makes a move that leads to a line of the catalog a way to that line', async () => {
    const { element, onSelect } = await opened();
    const ways = [...element.querySelectorAll<HTMLButtonElement>('.stats__moves button')];

    expect(ways.map((way) => way.textContent)).toEqual(['Italian Game: Giuoco Pianissimo']);
    expect(ways[0]?.closest('li')?.textContent).toContain('3… Bc5');

    ways[0]?.click();

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(PIANISSIMO);
  });

  it('says how long the games last, and how many are over within twenty moves', async () => {
    const { text } = await opened();

    expect(text('.stats__length')).toBe(
      'The games last 34 moves on average, and 20% of them are over within twenty.',
    );
  });

  it('says what the numbers are of, and what they leave out', async () => {
    const { element } = await opened();
    const about = element.querySelector('.stats__about');

    expect(about?.tagName).toBe('DETAILS');
    expect(about?.querySelector('summary')?.textContent).toBe('What these numbers are');
    const said = about?.textContent ?? '';
    expect(said).toContain('One month of rated games on lichess');
    expect(said).toContain('lichess’s ratings, not FIDE’s');
    expect(said).toContain('every position it passes through, however it got there');
    expect(said).toMatch(/bot.*correspondence.*abandoned/);
  });
});

describe('fetching the detail', () => {
  it('asks for it when the panel is first opened, and says that it is on its way', async () => {
    const { panel, toggle, text, headings, settle } = setup();
    const coming = Promise.withResolvers<OpeningDetail>();
    const detail = vi.fn(() => coming.promise);
    panel.show(subjectOf(ITALIAN, detail));

    toggle.click();

    expect(detail).toHaveBeenCalledTimes(1);
    expect(text('.stats__notice[role="status"]')).toBe('Fetching the rest of the numbers…');
    // What came with the page is there already.
    expect(headings()).toEqual(['How often', 'How it goes']);

    coming.resolve(smallDetail(6));
    await settle();

    expect(text('.stats__notice')).toBeUndefined();
    expect(headings()).toHaveLength(6);
  });

  it('does not ask again when the panel is shut and opened', async () => {
    const { panel, toggle, headings, settle } = setup();
    const detail = vi.fn(async () => smallDetail(6));
    panel.show(subjectOf(ITALIAN, detail));

    toggle.click();
    await settle();
    toggle.click();
    toggle.click();
    await settle();

    expect(detail).toHaveBeenCalledTimes(1);
    expect(headings()).toHaveLength(6);
  });

  it('says so when it cannot be had, keeps what it has, and offers to try again', async () => {
    const { panel, element, toggle, text, headings, settle } = setup();
    const detail = vi
      .fn<() => Promise<OpeningDetail>>()
      .mockRejectedValueOnce(new Error('statistics/0.json: HTTP 503'))
      .mockResolvedValueOnce(smallDetail(6));
    panel.show(subjectOf(ITALIAN, detail));

    toggle.click();
    await settle();

    expect(text('.stats__notice[role="alert"]')).toBe(
      'The rest of the numbers could not be fetched.',
    );
    expect(headings()).toEqual(['How often', 'How it goes']);

    element.querySelector<HTMLButtonElement>('.stats__retry')?.click();
    await settle();

    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(headings()).toHaveLength(6);
  });

  it('shows what came with the page, and asks for nothing, when there is no detail to be had', async () => {
    const { panel, toggle, headings, element, settle } = setup();
    panel.show(subjectOf(ITALIAN, null));

    toggle.click();
    await settle();

    expect(headings()).toEqual(['How often', 'How it goes']);
    expect(element.querySelector('.stats__notice')).toBeNull();
    expect(element.querySelector('.stats__about')).not.toBeNull();
  });
});

describe('moving to another opening', () => {
  it('stays open, and fetches the detail of the new one', async () => {
    const { panel, toggle, text, settle } = setup();
    const next = vi.fn(async () => smallDetail(4));
    panel.show(subjectOf(ITALIAN));
    toggle.click();
    await settle();

    panel.show(subjectOf(NAJDORF, next));
    await settle();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(next).toHaveBeenCalledTimes(1);
    expect(text('.stats__often')).toContain('20 games reached this position');
  });

  it('stays shut if it was shut, and fetches nothing', () => {
    const { panel, toggle } = setup();
    const next = vi.fn(async () => smallDetail(4));
    panel.show(subjectOf(ITALIAN));

    panel.show(subjectOf(NAJDORF, next));

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(next).not.toHaveBeenCalled();
  });

  it('does not show the detail of an opening that has been left by the time it comes', async () => {
    const { panel, toggle, text, texts, settle } = setup();
    const slow = Promise.withResolvers<OpeningDetail>();
    panel.show(subjectOf(ITALIAN, () => slow.promise));
    toggle.click();

    panel.show(subjectOf(NAJDORF));
    await settle();
    slow.resolve(smallDetail(6));
    await settle();

    expect(text('.stats__often')).toContain('20 games');
    expect(texts('.stats__moves .stats__move')[0]).toBe('6. Be3');
  });

  it('keeps the focus on its button, which stays where it was', async () => {
    const { panel, toggle, settle } = setup();
    panel.show(subjectOf(ITALIAN));
    toggle.focus();
    toggle.click();
    await settle();

    panel.show(subjectOf(NAJDORF));
    await settle();

    expect(document.activeElement).toBe(toggle);
  });
});

describe('for an opening with too few games to carry a score', () => {
  async function opened() {
    const all = setup();
    all.panel.show(subjectOf(NAJDORF));
    all.toggle.click();
    await all.settle();
    return all;
  }

  it('still says how many games there were, and what share', async () => {
    const { text } = await opened();

    expect(text('.stats__often')).toBe(
      '20 games reached this position: 1 game in 50,000 of the 1,000,000 counted on lichess in October 2026.',
    );
  });

  it('counts the wins, draws and losses, and says there are too few for a score', async () => {
    const { element, texts, text } = await opened();

    expect(texts('.stats__outcomes li')).toEqual(['White wins 9', 'Draws 1', 'Black wins 10']);
    expect(text('.stats__score')).toBe('Too few games to say how the opening scores.');
    expect(element.querySelector('.stats__ratings')).toBeNull();
    expect(element.querySelector('.stats__bar')).not.toBeNull();
  });

  it('gives the shares band by band and speed by speed, but no scores', async () => {
    const { table } = await opened();

    expect(table('Who plays it').map(([, , score]) => score)).toEqual([
      'no games',
      'too few games',
      'too few games',
      'too few games',
      'no games',
    ]);
    expect(table('Who plays it').map(([, share]) => share)).toEqual([
      '0%',
      '0.0017%',
      '0.0033%',
      '0.0033%',
      '0%',
    ]);
  });

  it('still lists what was played next, and how long the games were', async () => {
    const { texts, text, element } = await opened();

    expect(texts('.stats__moves .stats__move')).toEqual(['6. Be3', '6. Bg5', 'Other moves']);
    expect(texts('.stats__moves .stats__move-share')).toEqual(['40%', '35%', '25%']);
    expect(element.querySelector('.stats__moves button')?.textContent).toBe(
      'Sicilian Defense: Najdorf Variation, English Attack',
    );
    expect(text('.stats__length')).toBe(
      'The games last 40 moves on average, and 5% of them are over within twenty.',
    );
  });
});

describe('for an opening no game reached', () => {
  it('says so, and nothing else, and fetches nothing', async () => {
    const { panel, toggle, headings, text, element, settle } = setup();
    const detail = vi.fn(async () => smallDetail(5));
    panel.show(subjectOf(ENGLISH_ATTACK, detail));

    toggle.click();
    await settle();

    expect(text('.stats__often')).toBe(
      'None of the 1,000,000 games counted on lichess in October 2026 reached this position.',
    );
    expect(headings()).toEqual(['How often']);
    expect(detail).not.toHaveBeenCalled();
    expect(element.querySelector('.stats__about')).not.toBeNull();
  });
});
