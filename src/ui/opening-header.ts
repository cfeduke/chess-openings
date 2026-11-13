import './opening-header.css';
import { parseOpeningName } from '../catalog/name.ts';
import type { Opening } from '../data/opening.ts';
import { el } from '../dom.ts';
import { ECO_VOLUMES, ecoGroupOf, ecoRangeLabel } from '../eco/taxonomy.ts';

/** Where an opening sits in the encyclopaedia: its volume, then its group of codes. */
function place({ eco }: Opening): string {
  const volume = ECO_VOLUMES.find((candidate) => candidate.letter === eco[0]);
  const group = ecoGroupOf(eco);
  return `Volume ${volume?.letter} · ${volume?.title} › ${ecoRangeLabel(group)} · ${group.title}`;
}

/** The name of the opening on the board, above the board. */
export function createOpeningHeader(): {
  element: HTMLElement;
  show(opening: Opening | null): void;
} {
  const element = el('header', { class: 'opening' });

  const show = (opening: Opening | null) => {
    if (!opening) {
      element.replaceChildren(
        el('h2', { class: 'opening__name' }, 'Choose an opening'),
        el(
          'p',
          { class: 'opening__place' },
          'Pick one from the catalog to watch it played, move by move.',
        ),
      );
      return;
    }

    const { family, variation } = parseOpeningName(opening.name);
    const name = el(
      'h2',
      { class: 'opening__name', 'aria-label': `${opening.eco} ${opening.name}` },
      el('span', { class: 'opening__eco' }, opening.eco),
      el('span', { class: 'opening__family' }, family),
    );
    if (variation) name.append(el('span', { class: 'opening__variation' }, variation));
    element.replaceChildren(el('p', { class: 'opening__place' }, place(opening)), name);
  };

  show(null);
  return { element, show };
}
