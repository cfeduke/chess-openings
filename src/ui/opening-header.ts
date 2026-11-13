import './opening-header.css';
import type { CatalogLine, CatalogPlace } from '../catalog/catalog.ts';
import type { Opening } from '../data/opening.ts';
import { el } from '../dom.ts';
import { ecoRangeLabel } from '../eco/taxonomy.ts';
import { iconButton } from './icon-button.ts';

/** What sits above the board: the opening's name, or an invitation to choose one. */
export interface OpeningHeader {
  element: HTMLElement;
  /** Names the opening on the board; with `null`, invites a choice. */
  show(place: CatalogPlace | null): void;
  /** Offers these well-known openings whenever a choice is invited. */
  suggest(openings: Opening[]): void;
}

export function createOpeningHeader({
  onSelect,
}: {
  onSelect(opening: Opening): void;
}): OpeningHeader {
  const element = el('header', { class: 'opening' });
  let shown: CatalogPlace | null = null;
  let classics: Opening[] = [];

  const invitation = (): Node[] => {
    const parts: Node[] = [
      el('h2', { class: 'opening__name' }, 'Choose an opening'),
      el(
        'p',
        { class: 'opening__place' },
        'Pick one from the catalog to watch it played, move by move.',
      ),
    ];
    if (classics.length > 0) {
      const buttons = classics.map((opening) => {
        const button = el('button', { type: 'button', class: 'classic' }, opening.name);
        button.addEventListener('click', () => onSelect(opening));
        return el('li', {}, button);
      });
      parts.push(
        el('ul', { class: 'opening__classics', 'aria-label': 'Well-known openings' }, ...buttons),
      );
    }
    return parts;
  };

  /** The step to a neighbouring line of the family; disabled where the family ends. */
  const step = (direction: 'Previous' | 'Next', line: CatalogLine | undefined) => {
    const name = line ? `${direction} line: ${line.variation || 'Main line'}` : `${direction} line`;
    const button = iconButton(name, direction === 'Previous' ? 'back' : 'forward', () => {
      if (line) onSelect(line.opening);
    });
    button.disabled = !line;
    return button;
  };

  const nameOf = ({ opening, volume, group, family, index }: CatalogPlace): Node[] => {
    const { variation } = family.lines[index] as CatalogLine;
    const name = el(
      'h2',
      { class: 'opening__name', 'aria-label': `${opening.eco} ${opening.name}` },
      el('span', { class: 'opening__eco eco-badge' }, opening.eco),
      el('span', { class: 'opening__family' }, family.name),
    );
    if (variation) name.append(el('span', { class: 'opening__variation' }, variation));

    const filedUnder =
      `Volume ${volume.volume.letter} · ${volume.volume.title} › ` +
      `${ecoRangeLabel(group.group)} · ${group.group.title}`;
    const parts: Node[] = [el('p', { class: 'opening__place' }, filedUnder), name];

    if (family.lines.length > 1) {
      parts.push(
        el(
          'div',
          { class: 'opening__lines', role: 'group', 'aria-label': `Lines of ${family.name}` },
          step('Previous', family.lines[index - 1]),
          el('span', { class: 'opening__position' }, `${index + 1} of ${family.lines.length}`),
          step('Next', family.lines[index + 1]),
        ),
      );
    }
    return parts;
  };

  const render = () => element.replaceChildren(...(shown ? nameOf(shown) : invitation()));
  render();

  return {
    element,
    show(place) {
      shown = place;
      render();
    },
    suggest(openings) {
      classics = openings;
      render();
    },
  };
}
