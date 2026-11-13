import './transport.css';
import type { SoundEffects } from '../audio/sound-effects.ts';
import { el } from '../dom.ts';
import type { Player, PlayerSnapshot } from '../playback/player.ts';
import { MAX_DELAY_MS, MIN_DELAY_MS } from '../playback/schedule.ts';
import { ICONS, type IconName } from './icons.ts';

interface TransportOptions {
  player: Player;
  sounds: Pick<SoundEffects, 'muted' | 'setMuted'>;
  /** Called with the delay the visitor has just chosen, so that it can be remembered. */
  saveDelay(delayMs: number): void;
  onFlip(): void;
}

const seconds = (delayMs: number) => (delayMs / 1000).toFixed(1);

/** `1.5 s` */
export function formatDelay(delayMs: number): string {
  return `${seconds(delayMs)} s`;
}

/** A button that is all icon: its name is for assistive technology and the tooltip. */
function iconButton(name: string, icon: IconName, onClick: () => void): HTMLButtonElement {
  const button = el('button', { type: 'button', class: 'icon-button' });
  dress(button, name, icon);
  button.addEventListener('click', onClick);
  return button;
}

function dress(button: HTMLButtonElement, name: string, icon: IconName): void {
  if (button.getAttribute('aria-label') === name) return;
  button.setAttribute('aria-label', name);
  button.title = name;
  button.innerHTML = ICONS[icon];
}

/**
 * The controls along the bottom of the interface: playback buttons, the slider for the delay
 * between moves, and the sound and board-orientation toggles.
 */
export function createTransport(options: TransportOptions): { element: HTMLElement } {
  const { player, sounds, saveDelay, onFlip } = options;

  const restart = iconButton('Restart', 'restart', player.restart);
  const back = iconButton('Step back', 'back', player.stepBack);
  const toggle = iconButton('Play', 'play', player.toggle);
  toggle.classList.add('icon-button--primary');
  const forward = iconButton('Step forward', 'forward', player.stepForward);
  const end = iconButton('Jump to end', 'end', () => player.seek(player.snapshot.moves.length));
  const playback = el(
    'div',
    { class: 'transport__playback', role: 'group', 'aria-label': 'Playback' },
    restart,
    back,
    toggle,
    forward,
    end,
  );

  const slider = el('input', {
    type: 'range',
    id: 'delay',
    class: 'transport__slider',
    min: String(MIN_DELAY_MS),
    max: String(MAX_DELAY_MS),
    step: '100',
  });
  const readout = el('output', { for: slider.id, class: 'transport__readout' });
  const delay = el(
    'div',
    { class: 'transport__delay' },
    el('label', { for: slider.id }, 'Delay between moves'),
    slider,
    readout,
  );
  slider.addEventListener('input', () => {
    const chosen = Number(slider.value);
    player.setDelay(chosen);
    saveDelay(chosen);
  });

  const flip = iconButton('Flip board', 'flip', onFlip);
  const sound = iconButton('Sound', 'soundOn', () => {
    sounds.setMuted(!sounds.muted);
    renderSound();
  });
  const renderSound = () => {
    sound.setAttribute('aria-pressed', String(!sounds.muted));
    sound.innerHTML = sounds.muted ? ICONS.soundOff : ICONS.soundOn;
  };
  const toggles = el('div', { class: 'transport__toggles' }, flip, sound);

  const element = el(
    'footer',
    { class: 'transport', role: 'group', 'aria-label': 'Player controls' },
    delay,
    playback,
    toggles,
  );

  const render = ({ playing, moves, ply, delayMs }: PlayerSnapshot) => {
    const over = ply === moves.length;
    if (playing) dress(toggle, 'Pause', 'pause');
    else if (over && moves.length > 0) dress(toggle, 'Play again', 'replay');
    else dress(toggle, 'Play', 'play');

    restart.disabled = toggle.disabled = moves.length === 0;
    back.disabled = ply === 0;
    forward.disabled = end.disabled = over;

    slider.value = String(delayMs);
    slider.setAttribute('aria-valuetext', `${seconds(delayMs)} seconds`);
    readout.textContent = formatDelay(delayMs);
  };

  renderSound();
  render(player.snapshot);
  player.subscribe(render);
  return { element };
}
