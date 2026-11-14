// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { encyclopaedia, SMALL_BOOK } from '../../tests/support/openings.ts';
import { SMALL_STATISTICS } from '../../tests/support/statistics.ts';
import { buildCatalog } from '../catalog/catalog.ts';
import type { MostPlayedData } from '../statistics/data.ts';
import { LINES_REDRAWN } from './catalog.ts';
import { mostPlayedPage } from './most-played.ts';

const RANKING = SMALL_STATISTICS.mostPlayed as MostPlayedData;

function setup(openings = SMALL_BOOK, ranking = RANKING) {
  const catalog = buildCatalog([encyclopaedia(openings)]);
  const page = mostPlayedPage({ catalog, ranking, source: SMALL_STATISTICS.source });
  const { element } = page;
  const rows = () => [...element.querySelectorAll<HTMLElement>('.ranking .line')];
  const part = (selector: string) =>
    rows().map((row) => row.querySelector(selector)?.textContent ?? null);
  const players = element.querySelector('select') as HTMLSelectElement;
  const choose = (label: string) => {
    players.value = [...players.options].find((option) => option.text === label)?.value ?? '';
    players.dispatchEvent(new Event('change', { bubbles: true }));
  };
  return { page, element, rows, part, players, choose };
}

describe('the page of the most played openings', () => {
  it('is a page for the catalog to put ahead of a collection’s sections', () => {
    const { page } = setup();

    expect(page).toMatchObject({
      id: 'most-played',
      tab: 'Top',
      name: 'Most played',
      title: 'The openings to start with',
    });
  });

  it('says what it is, and of which games', () => {
    const { element } = setup();

    expect(element.querySelector('h2')?.textContent).toBe('The openings to start with');
    const summary = element.querySelector('.section__summary')?.textContent;
    expect(summary).toContain('1,000,000 games');
    expect(summary).toContain('October 2026');
    expect(summary).toContain('lichess');
  });

  it('says what the numbers are not: the ratings are lichess’s, the games mostly fast', () => {
    const note = setup().element.querySelector('.most-played__note')?.textContent;

    expect(note).toContain('bullet and blitz');
    expect(note).toContain('ratings are lichess’s');
    expect(note).toMatch(/reached in/);
  });

  it('lists the families in order of the share of games that reach them', () => {
    const { element, part } = setup();

    expect(element.querySelector('.ranking')?.tagName).toBe('OL');
    expect(part('.line__name')).toEqual([
      'Slav Defense',
      'Sicilian Defense',
      'Scandinavian Defense',
      'Italian Game',
      'Polish Opening',
    ]);
    expect(part('.ranked__rank')).toEqual(['1', '2', '3', '4', '5']);
  });

  it('gives each its moves, its share as a figure and a meter, and White’s score', () => {
    const { rows, part } = setup();

    expect(part('.line__moves')).toEqual([
      '1. d4 d5 2. c4 c6',
      '1. e4 c5',
      '1. e4 d5',
      '1. e4 e5 2. Nf3 Nc6 3. Bc4',
      '1. b4',
    ]);
    expect(part('.ranked__share')).toEqual(['15%', '9.2%', '6.8%', '3.9%', '0.2%']);
    expect(rows().map((row) => row.querySelector<HTMLElement>('.meter')?.title)).toEqual([
      '15% of games',
      '9.2% of games',
      '6.8% of games',
      '3.9% of games',
      '0.2% of games',
    ]);
    expect(part('.ranked__score')).toEqual([
      'White scores 52.0%',
      'White scores 52.0%',
      'White scores 52.0%',
      'White scores 57.0%',
      'White scores 52.0%',
    ]);
  });

  it('reads out each row once: the figure on show is the one the meter says', () => {
    const [slav] = setup().rows();

    expect(slav?.querySelector('.ranked__share')?.getAttribute('aria-hidden')).toBe('true');
    expect(slav?.textContent).toBe(
      '1Slav Defense1. d4 d5 2. c4 c615%reached in 15% of gamesWhite scores 52.0%',
    );
  });

  it('makes each a line of the catalog, which is chosen as lines are', () => {
    const { rows } = setup();

    expect(rows().map((row) => row.tagName)).toEqual(Array(5).fill('BUTTON'));
    expect(rows().map((row) => row.dataset.opening)).toEqual([
      'slav-defense',
      'sicilian-defense',
      'scandinavian-defense',
      'italian-game',
      'polish-opening',
    ]);
  });

  it('can be asked for the players of one strength, in place of all of them', () => {
    const { players } = setup();

    expect(players.labels?.[0]?.textContent).toBe('Players');
    expect([...players.options].map((option) => option.text)).toEqual([
      'All players',
      'Under 1200',
      '1200–1599',
      '1600–1999',
      '2000–2399',
      '2400 and over',
    ]);
    expect(players.selectedOptions[0]?.text).toBe('All players');
  });

  it('ranks the same families again by the games of the strength that is chosen', () => {
    const { part, choose } = setup();

    choose('Under 1200');

    expect(part('.line__name')).toEqual([
      'Scandinavian Defense',
      'Italian Game',
      'Slav Defense',
      'Sicilian Defense',
      'Polish Opening',
    ]);
    expect(part('.ranked__rank')).toEqual(['1', '2', '3', '4', '5']);
    expect(part('.ranked__share')).toEqual(['15%', '11%', '5%', '4%', '0.2%']);

    choose('All players');
    expect(part('.line__name')[0]).toBe('Slav Defense');
  });

  it('tells the catalog when it has drawn its lines again', () => {
    const { element, choose } = setup();
    const redrawn = vi.fn();
    const host = document.createElement('div');
    host.append(element);
    host.addEventListener(LINES_REDRAWN, redrawn);

    choose('2400 and over');

    expect(redrawn).toHaveBeenCalledTimes(1);
  });

  it('passes over a family the catalog does not have, and numbers the rest in turn', () => {
    const without = SMALL_BOOK.filter((opening) => opening.id !== 'sicilian-defense');
    const { part } = setup(without);

    expect(part('.line__name')).toEqual([
      'Slav Defense',
      'Scandinavian Defense',
      'Italian Game',
      'Polish Opening',
    ]);
    expect(part('.ranked__rank')).toEqual(['1', '2', '3', '4']);
  });

  it('stops at twenty', () => {
    const many: MostPlayedData = {
      ...RANKING,
      families: Array.from({ length: 30 }, () => RANKING.families[0]).filter((family) => !!family),
    };

    expect(setup(SMALL_BOOK, many).rows()).toHaveLength(20);
  });
});
