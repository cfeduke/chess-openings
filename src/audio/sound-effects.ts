import type { SoundCue } from '../playback/player.ts';
import type { Preference } from '../preferences.ts';
import { scheduleCue } from './voices.ts';

export interface SoundEffects {
  readonly muted: boolean;
  /** Switches sound off or on, and remembers the choice. */
  setMuted(muted: boolean): void;
  /**
   * Starts the audio engine, or restarts it after a silence. Browsers only allow that in
   * response to a user gesture, so call this from every one; until the first, `play` is silent.
   */
  wake(): void;
  play(cue: SoundCue): void;
}

interface SoundEffectsOptions {
  /** Where the mute setting is kept. Without it, sound is on and the choice is not remembered. */
  muted?: Preference<boolean>;
  /** Makes the audio context, or returns undefined where there is no Web Audio. */
  createContext?: () => AudioContext | undefined;
}

const MASTER_VOLUME = 0.7;
/** Sounds are scheduled this far ahead, in seconds, so that their first samples are not cut off. */
const LEAD_IN = 0.01;
/** A running audio engine keeps the sound card busy, so it is put to sleep after this much silence. */
const SLEEP_AFTER_MS = 20_000;

const browserAudioContext = () =>
  typeof AudioContext === 'undefined' ? undefined : new AudioContext();

export function createSoundEffects(options: SoundEffectsOptions = {}): SoundEffects {
  const { createContext = browserAudioContext } = options;
  let muted = options.muted?.read() ?? false;
  let engine: { context: AudioContext; master: GainNode } | undefined;
  let sleep: ReturnType<typeof setTimeout> | undefined;

  const stayAwake = () => {
    clearTimeout(sleep);
    sleep = setTimeout(() => engine?.context.suspend(), SLEEP_AFTER_MS);
  };

  const wake = () => {
    if (muted) return;
    if (!engine) {
      const context = createContext();
      if (!context) return;
      const master = context.createGain();
      master.gain.value = MASTER_VOLUME;
      master.connect(context.destination);
      engine = { context, master };
    }
    // A browser that still refuses leaves the context suspended, and `play` stays silent.
    if (engine.context.state !== 'running') engine.context.resume().catch(() => {});
    stayAwake();
  };

  return {
    get muted() {
      return muted;
    },

    setMuted(next) {
      muted = next;
      options.muted?.write(next);
      // Switching sound on is a gesture in its own right.
      wake();
    },

    wake,

    play(cue) {
      // A context that is not running would hoard what is scheduled and blurt it out later.
      if (muted || engine?.context.state !== 'running') return;
      scheduleCue(engine.context, engine.master, cue, engine.context.currentTime + LEAD_IN);
      stayAwake();
    },
  };
}
