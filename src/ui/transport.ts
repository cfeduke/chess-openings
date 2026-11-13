import './transport.css';
import type { SoundEffects } from '../audio/sound-effects.ts';
import { el } from '../dom.ts';
import type { Player, PlayerSnapshot } from '../playback/player.ts';
import { MAX_DELAY_MS, MIN_DELAY_MS } from '../playback/schedule.ts';
import { dress, iconButton } from './icon-button.ts';
import { ICONS } from './icons.ts';

interface TransportOptions {
  player: Player;
  sounds: Pick<SoundEffects, 'muted' | 'setMuted'>;
  onFlip(): void;
}

/** `1.5` for a delay of 1500 ms. */
const seconds = (delayMs: number) => (delayMs / 1000).toFixed(1);

/**
 * The controls along the bottom of the interface: playback buttons, the slider for the delay
 * between moves, and the sound and board-orientation toggles.
 */
export function createTransport(options: TransportOptions): {
  element: HTMLElement;
  /** Moves the keyboard focus to the play button. */
  focus(): void;
} {
  const { player, sounds, onFlip } = options;

  const restart = iconButton('Restart', 'restart', player.restart);
  const back = iconButton('Step back', 'back', player.stepBack);
  const toggle = iconButton('Play', 'play', player.toggle);
  toggle.classList.add('icon-button--primary');
  const forward = iconButton('Step forward', 'forward', player.stepForward);
  const end = iconButton('Jump to end', 'end', () => player.seek(Number.POSITIVE_INFINITY));
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
    min: MIN_DELAY_MS,
    max: MAX_DELAY_MS,
    step: 100,
    // The whole name, whatever part of the label there is room to show.
    'aria-label': 'Delay between moves',
  });
  const readout = el('output', { for: slider.id, class: 'transport__readout' });
  const delay = el(
    'div',
    { class: 'transport__delay' },
    el(
      'label',
      { for: slider.id },
      'Delay',
      el('span', { class: 'transport__label-rest' }, ' between moves'),
    ),
    slider,
    readout,
  );
  slider.addEventListener('input', () => player.setDelay(Number(slider.value)));

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
    readout.textContent = `${seconds(delayMs)} s`;
  };

  renderSound();
  render(player.snapshot);
  player.subscribe(render);
  return { element, focus: () => toggle.focus() };
}
