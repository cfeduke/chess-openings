import './opening-header.css';
import { type CatalogLine, type CatalogPlace, fullName, lineLabel } from '../catalog/catalog.ts';
import type { Opening } from '../data/opening.ts';
import { el } from '../dom.ts';
import { dress, iconButton } from './icon-button.ts';
import type { IconName } from './icons.ts';

/** What sits above the board: the opening's name, or an invitation to choose one. */
export function createOpeningHeader({ onSelect }: { onSelect(opening: Opening): void }): {
  element: HTMLElement;
  /** Names the opening on the board; with `null`, invites a choice. */
  show(place: CatalogPlace | null): void;
  /** Offers these well-known openings whenever a choice is invited. */
  suggest(openings: Opening[]): void;
} {
  let shown: CatalogPlace | null = null;
  let classics: Opening[] = [];

  /** The opening's name and where it is filed — or the invitation. Redrawn on every change. */
  const title = el('div', { class: 'opening__title' });
  /** The well-known openings, while a choice is invited. */
  const offers = el('div', { class: 'opening__offers' });
  /** The link to where the opening can be read about, while it has such a place. */
  let more: HTMLElement | null = null;

  // The steps to the neighbouring lines of the family. Unlike the rest these stay in place from
  // one line to the next, so that a keyboard on "next" can keep pressing it.
  const neighbour = (offset: number) => shown?.family.lines[shown.index + offset];
  const step = (offset: number) => {
    const line = neighbour(offset);
    if (line) onSelect(line.opening);
  };
  const previous = iconButton('Previous line', 'back', () => step(-1));
  const next = iconButton('Next line', 'forward', () => step(1));
  const position = el('span', { class: 'opening__position' });
  const lines = el('div', { class: 'opening__lines', role: 'group' }, previous, position, next);

  /** Names a step after the line it leads to, and disables it where the family ends. */
  const aim = (button: HTMLButtonElement, name: string, icon: IconName, line?: CatalogLine) => {
    dress(button, line ? `${name}: ${lineLabel(line)}` : name, icon);
    button.disabled = !line;
  };

  const element = el('header', { class: 'opening' }, title, lines, offers);

  const render = () => {
    more?.remove();
    more = null;

    if (!shown) {
      title.replaceChildren(
        el('h2', { class: 'opening__name' }, 'Choose an opening'),
        el(
          'p',
          { class: 'opening__place' },
          'Pick one from the catalog to watch it played, move by move.',
        ),
      );
    } else {
      const { opening, collection, section, group, family, index } = shown;
      const variation = family.lines[index]?.variation;
      const name = el(
        'h2',
        { class: 'opening__name', 'aria-label': `${opening.eco} ${fullName(shown)}` },
        el('span', { class: 'opening__eco eco-badge' }, opening.eco),
        el('span', { class: 'opening__family' }, family.name),
      );
      if (variation) name.append(el('span', { class: 'opening__variation' }, variation));
      const filedUnder =
        `${section.name} · ${section.title} › ` +
        [group.codes, group.title].filter(Boolean).join(' · ');
      title.replaceChildren(el('p', { class: 'opening__place' }, filedUnder), name);

      lines.setAttribute('aria-label', `Lines of ${family.name}`);
      position.textContent = `${index + 1} of ${family.lines.length}`;

      const reading = collection.readMore?.(opening);
      if (reading) {
        more = el('p', { class: 'opening__more' }, el('a', { href: reading.href }, reading.label));
        lines.after(more);
      }
    }

    // A button that has just been disabled cannot hold the focus: pass it to the other one.
    const focused = document.activeElement;
    aim(previous, 'Previous line', 'back', neighbour(-1));
    aim(next, 'Next line', 'forward', neighbour(1));
    lines.hidden = previous.disabled && next.disabled;
    if (focused === previous && previous.disabled) next.focus();
    if (focused === next && next.disabled) previous.focus();

    const buttons = (shown ? [] : classics).map((opening) => {
      const button = el('button', { type: 'button', class: 'classic' }, opening.name);
      button.addEventListener('click', () => onSelect(opening));
      return el('li', {}, button);
    });
    offers.replaceChildren(
      ...(buttons.length > 0
        ? [
            el(
              'ul',
              { class: 'opening__classics', 'aria-label': 'Well-known openings' },
              ...buttons,
            ),
          ]
        : []),
    );
  };
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
