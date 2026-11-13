import type { SoundCue } from '../playback/player.ts';

/**
 * The sounds, synthesised with the Web Audio API so there are no audio files to ship. They are
 * built from two ingredients: a pitched note that is struck and dies away, and a knock of
 * filtered noise — together, roughly, a wooden piece being put down on a wooden board.
 */

/** Quiet enough to count as silence, but not zero: exponential ramps cannot reach zero. */
const SILENCE = 0.0001;

interface Note {
  at: number;
  /** Pitch in hertz; it may glide to `to` as the note dies away. */
  from: number;
  to?: number;
  shape?: OscillatorType;
  /** Loudness at the top of the attack, 0–1. */
  peak: number;
  attack?: number;
  decay: number;
}

function note(context: BaseAudioContext, output: AudioNode, options: Note): void {
  const { at, from, to = from, shape = 'sine', peak, attack = 0.004, decay } = options;
  const end = at + attack + decay;

  const oscillator = context.createOscillator();
  oscillator.type = shape;
  oscillator.frequency.setValueAtTime(from, at);
  if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(to, end);

  const envelope = context.createGain();
  envelope.gain.setValueAtTime(SILENCE, at);
  envelope.gain.exponentialRampToValueAtTime(peak, at + attack);
  envelope.gain.exponentialRampToValueAtTime(SILENCE, end);

  oscillator.connect(envelope).connect(output);
  oscillator.start(at);
  oscillator.stop(end + 0.01);
}

/** A tenth of a second of white noise per audio context, shared by every knock played on it. */
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseFor(context: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(context);
  if (!buffer) {
    buffer = context.createBuffer(1, Math.round(context.sampleRate * 0.1), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    noiseBuffers.set(context, buffer);
  }
  return buffer;
}

interface Knock {
  at: number;
  /** The centre of the band of noise let through, in hertz: higher is sharper. */
  centre: number;
  peak: number;
  decay: number;
}

function knock(
  context: BaseAudioContext,
  output: AudioNode,
  { at, centre, peak, decay }: Knock,
): void {
  const attack = 0.002;
  const end = at + attack + decay;

  const noise = context.createBufferSource();
  noise.buffer = noiseFor(context);

  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.setValueAtTime(centre, at);
  band.Q.setValueAtTime(1.1, at);

  const envelope = context.createGain();
  envelope.gain.setValueAtTime(SILENCE, at);
  envelope.gain.exponentialRampToValueAtTime(peak, at + attack);
  envelope.gain.exponentialRampToValueAtTime(SILENCE, end);

  noise.connect(band).connect(envelope).connect(output);
  noise.start(at);
  noise.stop(end + 0.01);
}

/**
 * A piece set down: a low thud for its weight, a pitched tock for the wood (which is what small
 * speakers will reproduce), and a knock for the moment of contact. `weight` above 1 lands harder.
 */
function placePiece(context: BaseAudioContext, output: AudioNode, at: number, weight = 1): void {
  note(context, output, {
    at,
    from: 190 / weight,
    to: 110 / weight,
    shape: 'triangle',
    peak: 0.3 * weight,
    decay: 0.12,
  });
  note(context, output, {
    at,
    from: 440 / weight,
    to: 330 / weight,
    peak: 0.22 * weight,
    decay: 0.08,
  });
  knock(context, output, { at, centre: 1800, peak: 0.22 * weight, decay: 0.03 });
}

/** A soft bell-like note: a fundamental with a quieter octave above it. */
function bell(
  context: BaseAudioContext,
  output: AudioNode,
  at: number,
  pitch: number,
  peak: number,
  decay: number,
): void {
  note(context, output, { at, from: pitch, peak, attack: 0.012, decay });
  note(context, output, {
    at,
    from: pitch * 2,
    peak: peak * 0.25,
    attack: 0.012,
    decay: decay * 0.6,
  });
}

const E5 = 659.25;
const A5 = 880;
const B5 = 987.77;
const C_SHARP_6 = 1108.73;

const VOICES: Record<SoundCue, (context: BaseAudioContext, output: AudioNode, at: number) => void> =
  {
    move: (context, output, at) => placePiece(context, output, at),

    // A capture lands harder, with the sharp crack of the taken piece being knocked aside.
    capture: (context, output, at) => {
      placePiece(context, output, at, 1.3);
      knock(context, output, { at, centre: 3200, peak: 0.3, decay: 0.045 });
    },

    // Two pieces go down: the king, then the rook.
    castle: (context, output, at) => {
      placePiece(context, output, at);
      placePiece(context, output, at + 0.11, 1.08);
    },

    // A single bright note, late enough to follow the move that gives the check.
    check: (context, output, at) => bell(context, output, at + 0.09, B5, 0.18, 0.32),

    // Three rising notes of an A major chord.
    complete: (context, output, at) => {
      bell(context, output, at, E5, 0.14, 0.5);
      bell(context, output, at + 0.13, A5, 0.14, 0.55);
      bell(context, output, at + 0.26, C_SHARP_6, 0.15, 0.8);
    },
  };

/** Schedules the sound of `cue` on `context`, starting at time `at`, into `output`. */
export function scheduleCue(
  context: BaseAudioContext,
  output: AudioNode,
  cue: SoundCue,
  at: number,
): void {
  VOICES[cue](context, output, at);
}
