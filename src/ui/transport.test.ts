// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fakePlayer } from '../../tests/support/fake-player.ts';
import { ITALIAN_MOVES as italian } from '../../tests/support/lines.ts';
import { createTransport } from './transport.ts';

function setup(initial: Parameters<typeof fakePlayer>[0] = { moves: italian }, muted = false) {
  const { player, emit } = fakePlayer(initial);
  const sounds = {
    muted,
    setMuted: vi.fn((next: boolean) => {
      sounds.muted = next;
    }),
  };
  const onFlip = vi.fn();
  const { element } = createTransport({ player, sounds, onFlip });
  const button = (name: string) => {
    const found = element.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
    if (!found) throw new Error(`no button named ${name}`);
    return found;
  };
  const slider = element.querySelector('input[type="range"]') as HTMLInputElement;
  /** What the big button in the middle currently offers to do. */
  const mainAction = () =>
    element.querySelector('.icon-button--primary')?.getAttribute('aria-label');
  return { player, emit, sounds, onFlip, element, button, slider, mainAction };
}

describe('the transport bar', () => {
  it('groups its playback buttons under one name, in playing order', () => {
    const { element } = setup();

    const group = element.querySelector('[role="group"][aria-label="Playback"]');
    const names = [...(group?.querySelectorAll('button') ?? [])].map((button) =>
      button.getAttribute('aria-label'),
    );
    expect(names).toEqual(['Restart', 'Step back', 'Play', 'Step forward', 'Jump to end']);
  });

  it('gives every button a tooltip matching its name', () => {
    const { element } = setup();

    for (const button of element.querySelectorAll('button')) {
      expect(button.title).toBe(button.getAttribute('aria-label'));
    }
  });
});

describe('the play button', () => {
  it('offers to play while stopped and to pause while playing', () => {
    const { emit, mainAction } = setup();
    expect(mainAction()).toBe('Play');

    emit({ playing: true });

    expect(mainAction()).toBe('Pause');
  });

  it('offers to play again once the line is over', () => {
    const { emit, mainAction } = setup();

    emit({ ply: 5, playing: false });

    expect(mainAction()).toBe('Play again');
  });

  it('still offers to pause during the last move', () => {
    const { emit, mainAction } = setup();

    emit({ ply: 5, playing: true });

    expect(mainAction()).toBe('Pause');
  });

  it('toggles playback', () => {
    const { player, button } = setup();

    button('Play').click();

    expect(player.toggle).toHaveBeenCalledTimes(1);
  });
});

describe('the other playback buttons', () => {
  it('restart, step and jump', () => {
    const { player, emit, button } = setup();
    emit({ ply: 2 });

    button('Restart').click();
    button('Step back').click();
    button('Step forward').click();
    button('Jump to end').click();

    expect(player.restart).toHaveBeenCalledTimes(1);
    expect(player.stepBack).toHaveBeenCalledTimes(1);
    expect(player.stepForward).toHaveBeenCalledTimes(1);
    expect(player.seek).toHaveBeenCalledWith(Number.POSITIVE_INFINITY);
  });

  it('cannot go back from the start', () => {
    const { button } = setup();

    expect(button('Step back').disabled).toBe(true);
    expect(button('Step forward').disabled).toBe(false);
    expect(button('Jump to end').disabled).toBe(false);
  });

  it('cannot go forward from the end', () => {
    const { emit, button } = setup();

    emit({ ply: 5 });

    expect(button('Step back').disabled).toBe(false);
    expect(button('Step forward').disabled).toBe(true);
    expect(button('Jump to end').disabled).toBe(true);
  });

  it('are all disabled when there is no line to play', () => {
    const { element } = setup({ moves: [] });

    const playback = element.querySelectorAll<HTMLButtonElement>('[aria-label="Playback"] button');
    expect([...playback].every((button) => button.disabled)).toBe(true);
  });
});

describe('the delay slider', () => {
  it('runs from 0.3 to 5 seconds in tenths and starts at the player’s delay', () => {
    const { slider } = setup();

    expect(slider.min).toBe('300');
    expect(slider.max).toBe('5000');
    expect(slider.step).toBe('100');
    expect(slider.value).toBe('1500');
  });

  it('is labelled, and says what it is set to', () => {
    const { element, slider } = setup();

    expect(element.querySelector(`label[for="${slider.id}"]`)?.textContent).toBe(
      'Delay between moves',
    );
    expect(slider.getAttribute('aria-label')).toBe('Delay between moves');
    expect(element.querySelector('output')?.textContent).toBe('1.5 s');
    expect(slider.getAttribute('aria-valuetext')).toBe('1.5 seconds');
  });

  it('sets the player’s delay as it is dragged', () => {
    const { player, slider } = setup();

    slider.value = '800';
    slider.dispatchEvent(new Event('input', { bubbles: true }));

    expect(player.setDelay).toHaveBeenCalledWith(800);
  });

  it('follows the player when the delay changes', () => {
    const { emit, element, slider } = setup();

    emit({ delayMs: 3200 });

    expect(slider.value).toBe('3200');
    expect(element.querySelector('output')?.textContent).toBe('3.2 s');
  });
});

describe('the sound button', () => {
  it('shows whether sound is on', () => {
    expect(setup().button('Sound').getAttribute('aria-pressed')).toBe('true');
    expect(setup(undefined, true).button('Sound').getAttribute('aria-pressed')).toBe('false');
  });

  it('switches sound off and on', () => {
    const { sounds, button } = setup();

    button('Sound').click();
    expect(sounds.setMuted).toHaveBeenLastCalledWith(true);
    expect(button('Sound').getAttribute('aria-pressed')).toBe('false');

    button('Sound').click();
    expect(sounds.setMuted).toHaveBeenLastCalledWith(false);
    expect(button('Sound').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('the flip button', () => {
  it('turns the board around', () => {
    const { onFlip, button } = setup();

    button('Flip board').click();

    expect(onFlip).toHaveBeenCalledTimes(1);
  });
});
