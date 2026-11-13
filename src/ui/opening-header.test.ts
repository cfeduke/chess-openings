// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { ITALIAN, NAJDORF, SMALL_BOOK } from '../../tests/support/openings.ts';
import { buildCatalog, type CatalogPlace } from '../catalog/catalog.ts';
import type { Opening } from '../data/opening.ts';
import { createOpeningHeader } from './opening-header.ts';

const catalog = buildCatalog(SMALL_BOOK);
const placeOf = (opening: Opening) => catalog.locate(opening.id) as CatalogPlace;
const named = (name: string) => SMALL_BOOK.find((opening) => opening.name === name) as Opening;
const POLISH = named('Polish Opening');
const ENGLISH_ATTACK = named('Sicilian Defense: Najdorf Variation, English Attack');
const PIANISSIMO = named('Italian Game: Giuoco Pianissimo');

function setup() {
  const onSelect = vi.fn();
  const header = createOpeningHeader({ onSelect });
  const { element } = header;
  const text = (selector: string) => element.querySelector(selector)?.textContent;
  const button = (name: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('button')].find((found) =>
      (found.getAttribute('aria-label') ?? found.textContent ?? '').startsWith(name),
    );
  return { header, element, onSelect, text, button };
}

describe('before anything is chosen', () => {
  it('invites a choice', () => {
    const { text, element } = setup();

    expect(text('h2')).toBe('Choose an opening');
    expect(element.textContent).toContain('catalog');
  });

  it('offers the well-known openings it is given, to start from', () => {
    const { header, element } = setup();

    header.suggest([ITALIAN, NAJDORF]);

    const classics = element.querySelector('[aria-label="Well-known openings"]');
    expect(
      [...(classics?.querySelectorAll('button') ?? [])].map((button) => button.textContent),
    ).toEqual(['Italian Game', 'Sicilian Defense: Najdorf Variation']);
  });

  it('opens one when it is clicked', () => {
    const { header, button, onSelect } = setup();
    header.suggest([ITALIAN, NAJDORF]);

    button('Sicilian Defense: Najdorf Variation')?.click();

    expect(onSelect).toHaveBeenCalledWith(NAJDORF);
  });
});

describe('with an opening on the board', () => {
  it('names it: its ECO code, its family, and its variation', () => {
    const { header, element, text } = setup();

    header.show(placeOf(NAJDORF));

    expect(text('.opening__eco')).toBe('B90');
    expect(text('.opening__family')).toBe('Sicilian Defense');
    expect(text('.opening__variation')).toBe('Najdorf Variation');
    expect(element.querySelector('h2')?.getAttribute('aria-label')).toBe(
      'B90 Sicilian Defense: Najdorf Variation',
    );
  });

  it('says where it sits in the encyclopaedia', () => {
    const { header, text } = setup();

    header.show(placeOf(NAJDORF));

    expect(text('.opening__place')).toBe(
      'Volume B · Semi-Open Games › B90–B99 · Sicilian Defense: Najdorf',
    );
  });

  it('shows a family’s main line without an empty variation', () => {
    const { header, element, text } = setup();

    header.show(placeOf(ITALIAN));

    expect(text('.opening__family')).toBe('Italian Game');
    expect(element.querySelector('.opening__variation')).toBeNull();
  });

  it('puts the well-known openings away', () => {
    const { header, element } = setup();
    header.suggest([ITALIAN, NAJDORF]);

    header.show(placeOf(POLISH));

    expect(element.querySelector('[aria-label="Well-known openings"]')).toBeNull();
  });

  it('goes back to the invitation, and the well-known openings, when there is none', () => {
    const { header, element, text } = setup();
    header.suggest([ITALIAN]);
    header.show(placeOf(NAJDORF));

    header.show(null);

    expect(text('h2')).toBe('Choose an opening');
    expect(element.querySelector('[aria-label="Well-known openings"] button')?.textContent).toBe(
      'Italian Game',
    );
  });
});

describe('the lines beside it in its family', () => {
  it('are a step away: the next one, and the one before', () => {
    const { header, button, onSelect } = setup();
    header.show(placeOf(NAJDORF));

    expect(button('Previous line')?.disabled).toBe(true);
    expect(button('Next line')?.getAttribute('aria-label')).toBe(
      'Next line: Najdorf Variation, English Attack',
    );

    button('Next line')?.click();
    expect(onSelect).toHaveBeenLastCalledWith(ENGLISH_ATTACK);

    header.show(placeOf(ENGLISH_ATTACK));
    expect(button('Next line')?.disabled).toBe(true);
    expect(button('Previous line')?.getAttribute('aria-label')).toBe(
      'Previous line: Najdorf Variation',
    );

    button('Previous line')?.click();
    expect(onSelect).toHaveBeenLastCalledWith(NAJDORF);
  });

  it('call a family’s own line its main line', () => {
    const { header, button } = setup();

    header.show(placeOf(PIANISSIMO));

    expect(button('Previous line')?.getAttribute('aria-label')).toBe('Previous line: Main line');
  });

  it('are counted, so you know how far through the family you are', () => {
    const { header, element, text } = setup();

    header.show(placeOf(ENGLISH_ATTACK));

    expect(text('.opening__position')).toBe('2 of 2');
    expect(element.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
      'Lines of Sicilian Defense',
    );
  });

  it('are not offered for a line that has its family to itself', () => {
    const { header, element } = setup();

    header.show(placeOf(POLISH));

    expect(element.querySelector('[role="group"]')).toBeNull();
  });
});
