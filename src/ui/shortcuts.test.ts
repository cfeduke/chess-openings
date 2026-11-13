// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { fakePlayer } from '../../tests/support/fake-player.ts';
import { ITALIAN_MOVES as italian } from '../../tests/support/lines.ts';
import { bindShortcuts } from './shortcuts.ts';

let unbind = () => {};

function setup() {
  const { player } = fakePlayer({ moves: italian, ply: 2 });
  unbind = bindShortcuts(document, player);
  /** Presses a key with the focus on `target`; returns whether the browser's default was left alone. */
  const press = (key: string, target: Element = document.body, modifiers: KeyboardEventInit = {}) =>
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }),
    );
  return { player, press };
}

function focusable(html: string): Element {
  document.body.innerHTML = html;
  return document.body.firstElementChild as Element;
}

afterEach(() => {
  unbind();
  document.body.innerHTML = '';
});

describe('keyboard shortcuts', () => {
  it('space plays and pauses, without scrolling the page', () => {
    const { player, press } = setup();

    const defaultAllowed = press(' ');

    expect(player.toggle).toHaveBeenCalledTimes(1);
    expect(defaultAllowed).toBe(false);
  });

  it('the arrow keys step back and forward', () => {
    const { player, press } = setup();

    press('ArrowLeft');
    press('ArrowRight');
    press('ArrowRight');

    expect(player.stepBack).toHaveBeenCalledTimes(1);
    expect(player.stepForward).toHaveBeenCalledTimes(2);
  });

  it('Home and End jump to the start and the end of the line', () => {
    const { player, press } = setup();

    press('Home');
    expect(player.seek).toHaveBeenLastCalledWith(0);

    press('End');
    expect(player.seek).toHaveBeenLastCalledWith(Number.POSITIVE_INFINITY);
  });

  it('leave other keys alone', () => {
    const { player, press } = setup();

    expect(press('a')).toBe(true);
    expect(press('Tab')).toBe(true);
    expect(player.toggle).not.toHaveBeenCalled();
  });

  it('leave keys pressed with a modifier to the browser', () => {
    const { player, press } = setup();

    press('ArrowLeft', document.body, { altKey: true });
    press('ArrowRight', document.body, { metaKey: true });
    press(' ', document.body, { ctrlKey: true });

    expect(player.stepBack).not.toHaveBeenCalled();
    expect(player.stepForward).not.toHaveBeenCalled();
    expect(player.toggle).not.toHaveBeenCalled();
  });

  it.each([
    ['a text field', '<input type="search" />'],
    ['a slider', '<input type="range" />'],
    ['a text area', '<textarea></textarea>'],
    ['a menu', '<select><option>a</option></select>'],
  ])('leave every key to %s that has the focus', (_, html) => {
    const { player, press } = setup();
    const field = focusable(html);

    expect(press('ArrowLeft', field)).toBe(true);
    expect(press(' ', field)).toBe(true);
    expect(press('Home', field)).toBe(true);

    expect(player.stepBack).not.toHaveBeenCalled();
    expect(player.toggle).not.toHaveBeenCalled();
    expect(player.seek).not.toHaveBeenCalled();
  });

  it('leave space to a focused button, which it already presses, but keep the arrows', () => {
    const { player, press } = setup();
    const button = focusable('<button>Flip board</button>');

    expect(press(' ', button)).toBe(true);
    press('ArrowRight', button);

    expect(player.toggle).not.toHaveBeenCalled();
    expect(player.stepForward).toHaveBeenCalledTimes(1);
  });

  it('leave a key to any control that has already used it', () => {
    const { player, press } = setup();
    const tabs = focusable('<div role="tablist" tabindex="0"></div>');
    tabs.addEventListener('keydown', (event) => event.preventDefault());

    press('ArrowRight', tabs);
    press('Home', tabs);

    expect(player.stepForward).not.toHaveBeenCalled();
    expect(player.seek).not.toHaveBeenCalled();
  });

  it('stop when unbound', () => {
    const { player, press } = setup();

    unbind();
    press(' ');

    expect(player.toggle).not.toHaveBeenCalled();
  });
});
