// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { ITALIAN, NAJDORF, opening } from '../../tests/support/openings.ts';
import { createOpeningHeader } from './opening-header.ts';

describe('the opening header', () => {
  it('invites a choice before anything is chosen', () => {
    const { element } = createOpeningHeader();

    expect(element.querySelector('h2')?.textContent).toBe('Choose an opening');
    expect(element.textContent).toContain('catalog');
  });

  it('names the opening: its ECO code, its family, and its variation', () => {
    const header = createOpeningHeader();

    header.show(NAJDORF);

    expect(header.element.querySelector('.opening__eco')?.textContent).toBe('B90');
    expect(header.element.querySelector('.opening__family')?.textContent).toBe('Sicilian Defense');
    expect(header.element.querySelector('.opening__variation')?.textContent).toBe(
      'Najdorf Variation',
    );
    expect(header.element.querySelector('h2')?.getAttribute('aria-label')).toBe(
      'B90 Sicilian Defense: Najdorf Variation',
    );
  });

  it('says where the opening sits in the encyclopaedia', () => {
    const header = createOpeningHeader();

    header.show(NAJDORF);

    expect(header.element.querySelector('.opening__place')?.textContent).toBe(
      'Volume B · Semi-Open Games › B90–B99 · Sicilian Defense: Najdorf',
    );
  });

  it('shows a family’s main line without an empty variation', () => {
    const header = createOpeningHeader();

    header.show(ITALIAN);

    expect(header.element.querySelector('.opening__family')?.textContent).toBe('Italian Game');
    expect(header.element.querySelector('.opening__variation')).toBeNull();
  });

  it('follows the choice, and goes back to the invitation when there is none', () => {
    const header = createOpeningHeader();
    header.show(NAJDORF);

    header.show(opening('A00', 'Polish Opening', 'b4'));
    expect(header.element.querySelector('.opening__family')?.textContent).toBe('Polish Opening');
    expect(header.element.querySelector('.opening__place')?.textContent).toBe(
      'Volume A · Flank Openings › A00 · Irregular First Moves',
    );

    header.show(null);
    expect(header.element.querySelector('h2')?.textContent).toBe('Choose an opening');
  });
});
