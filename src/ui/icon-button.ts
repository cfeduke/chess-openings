import { el } from '../dom.ts';
import { ICONS, type IconName } from './icons.ts';

/** Gives a button its name — for assistive technology and the tooltip — and its icon. */
export function dress(button: HTMLButtonElement, name: string, icon: IconName): void {
  if (button.getAttribute('aria-label') === name) return;
  button.setAttribute('aria-label', name);
  button.title = name;
  button.innerHTML = ICONS[icon];
}

/** A button that is all icon. */
export function iconButton(name: string, icon: IconName, onClick: () => void): HTMLButtonElement {
  const button = el('button', { type: 'button', class: 'icon-button' });
  dress(button, name, icon);
  button.addEventListener('click', onClick);
  return button;
}
