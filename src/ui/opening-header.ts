import './opening-header.css';
import type { CatalogPlace } from '../catalog/catalog.ts';
import { parseOpeningName } from '../catalog/name.ts';
import { el } from '../dom.ts';
import { ecoRangeLabel } from '../eco/taxonomy.ts';

/** The name of the opening on the board, above the board, with where the encyclopaedia files it. */
export function createOpeningHeader(): {
  element: HTMLElement;
  show(place: CatalogPlace | null): void;
} {
  const element = el('header', { class: 'opening' });

  const show = (place: CatalogPlace | null) => {
    if (!place) {
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

    const { opening, volume, group } = place;
    const { family, variation } = parseOpeningName(opening.name);
    const name = el(
      'h2',
      { class: 'opening__name', 'aria-label': `${opening.eco} ${opening.name}` },
      el('span', { class: 'opening__eco eco-badge' }, opening.eco),
      el('span', { class: 'opening__family' }, family),
    );
    if (variation) name.append(el('span', { class: 'opening__variation' }, variation));

    const filedUnder =
      `Volume ${volume.volume.letter} · ${volume.volume.title} › ` +
      `${ecoRangeLabel(group.group)} · ${group.group.title}`;
    element.replaceChildren(el('p', { class: 'opening__place' }, filedUnder), name);
  };

  show(null);
  return { element, show };
}
