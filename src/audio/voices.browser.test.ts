import { describe, expect, it } from 'vitest';
import type { SoundCue } from '../playback/player.ts';
import { scheduleCue } from './voices.ts';

const SAMPLE_RATE = 44_100;

/** Renders a cue to samples with the browser's real audio engine, faster than real time. */
async function render(cue: SoundCue): Promise<Float32Array> {
  const context = new OfflineAudioContext(1, SAMPLE_RATE * 2, SAMPLE_RATE);
  scheduleCue(context, context.destination, cue, 0);
  return (await context.startRendering()).getChannelData(0);
}

const peak = (samples: Float32Array) =>
  samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
const rms = (samples: Float32Array) =>
  Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
/** The seconds after which the sound never rises above a whisper again. */
const length = (samples: Float32Array) =>
  (samples.findLastIndex((sample) => Math.abs(sample) > 0.002) + 1) / SAMPLE_RATE;

// How long each cue may ring: a move must be over well before the next one at the fastest pace.
const LONGEST: Record<SoundCue, number> = {
  move: 0.25,
  capture: 0.3,
  castle: 0.4,
  check: 0.6,
  complete: 1.6,
};

describe.each(Object.keys(LONGEST) as SoundCue[])(
  'the %s cue, as the browser renders it',
  (cue) => {
    it('is clearly audible but never clips', async () => {
      const samples = await render(cue);

      expect(peak(samples)).toBeGreaterThan(0.08);
      expect(peak(samples)).toBeLessThan(0.9);
    });

    it('starts from silence and is over in good time', async () => {
      const samples = await render(cue);

      expect(Math.abs(samples[0] as number)).toBeLessThan(0.01);
      expect(length(samples)).toBeGreaterThan(0.03);
      expect(length(samples)).toBeLessThan(LONGEST[cue]);
    });
  },
);

describe('the cues, compared', () => {
  it('a capture carries more energy than a move', async () => {
    expect(rms(await render('capture'))).toBeGreaterThan(rms(await render('move')) * 1.2);
  });

  it('castling lasts longer than a single move', async () => {
    expect(length(await render('castle'))).toBeGreaterThan(length(await render('move')) + 0.05);
  });

  it('the closing chime is gentler than the knock of a move', async () => {
    expect(peak(await render('complete'))).toBeLessThan(peak(await render('move')));
  });
});
