import type { SoundCue } from '../playback/player.ts';
import { scheduleCue } from './voices.ts';

export interface SoundEffects {
  readonly muted: boolean;
  setMuted(muted: boolean): void;
  /**
   * Starts the audio engine. Browsers only allow that in response to a user gesture, so call
   * this from one; until then `play` is silent.
   */
  unlock(): void;
  play(cue: SoundCue): void;
}

interface SoundEffectsOptions {
  muted?: boolean;
  /** Makes the audio context, or returns undefined where there is no Web Audio. */
  createContext?: () => AudioContext | undefined;
}

const MASTER_VOLUME = 0.7;
/** Sounds are scheduled this far ahead, in seconds, so that their first samples are not cut off. */
const LEAD_IN = 0.01;

const browserAudioContext = () =>
  typeof AudioContext === 'undefined' ? undefined : new AudioContext();

export function createSoundEffects(options: SoundEffectsOptions = {}): SoundEffects {
  const { createContext = browserAudioContext } = options;
  let muted = options.muted ?? false;
  let engine: { context: AudioContext; master: GainNode } | undefined;

  return {
    get muted() {
      return muted;
    },

    setMuted(next) {
      muted = next;
    },

    unlock() {
      if (!engine) {
        const context = createContext();
        if (!context) return;
        const master = context.createGain();
        master.gain.value = MASTER_VOLUME;
        master.connect(context.destination);
        engine = { context, master };
      }
      // A browser that still refuses leaves the context suspended, and `play` stays silent.
      if (engine.context.state === 'suspended') engine.context.resume().catch(() => {});
    },

    play(cue) {
      // A suspended context would hoard what is scheduled and blurt it out when resumed.
      if (muted || engine?.context.state !== 'running') return;
      scheduleCue(engine.context, engine.master, cue, engine.context.currentTime + LEAD_IN);
    },
  };
}
