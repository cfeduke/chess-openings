import { describe, expect, it } from 'vitest';
import {
  asAudioContext,
  FakeAudioContext,
  type FakeGain,
  type FakeNode,
} from '../../tests/support/fake-audio.ts';
import type { SoundCue } from '../playback/player.ts';
import { scheduleCue } from './voices.ts';

const CUES: SoundCue[] = ['move', 'capture', 'castle', 'check', 'complete'];
const AT = 10;

function schedule(...cues: SoundCue[]) {
  const context = new FakeAudioContext();
  const output: FakeNode = context.createGain();
  for (const cue of cues)
    scheduleCue(asAudioContext(context), output as unknown as AudioNode, cue, AT);
  /** The gain nodes that shape individual sounds, as opposed to the output. */
  const envelopes = context.gains.filter((gain): gain is FakeGain => gain !== output);
  return { context, output, envelopes };
}

describe.each(CUES)('the %s cue', (cue) => {
  const { context, output, envelopes } = schedule(cue);

  it('makes sound, and sends all of it to the output', () => {
    expect(context.sources.length).toBeGreaterThan(0);
    for (const source of context.sources) expect(source.reaches(output)).toBe(true);
  });

  it('starts no earlier than asked and always stops', () => {
    for (const { startedAt, stoppedAt } of context.sources) {
      expect(startedAt).toBeGreaterThanOrEqual(AT);
      expect(stoppedAt).toBeGreaterThan(startedAt as number);
      expect(stoppedAt).toBeLessThan(AT + 2);
    }
  });

  it('rises from silence and dies away to silence, so nothing clicks', () => {
    expect(envelopes.length).toBeGreaterThan(0);
    for (const { gain } of envelopes) {
      expect(gain.events.at(0)?.value).toBeLessThanOrEqual(0.001);
      expect(gain.events.at(-1)?.value).toBeLessThanOrEqual(0.001);
      expect(gain.peak).toBeGreaterThan(0.01);
      expect(gain.peak).toBeLessThanOrEqual(1);
    }
  });
});

describe('what tells the cues apart', () => {
  const startTimes = (cue: SoundCue) =>
    [...new Set(schedule(cue).context.sources.map((source) => source.startedAt as number))].sort();
  const loudestKnock = (cue: SoundCue) => {
    const { context, envelopes } = schedule(cue);
    const knocks = envelopes.filter((envelope) =>
      context.bufferSources.some((noise) => noise.reaches(envelope)),
    );
    return Math.max(...knocks.map((knock) => knock.gain.peak));
  };

  it('a move is a single knock of wood on wood', () => {
    expect(startTimes('move')).toEqual([AT]);
    expect(schedule('move').context.bufferSources).toHaveLength(1);
  });

  it('a capture lands harder than a move', () => {
    expect(loudestKnock('capture')).toBeGreaterThan(loudestKnock('move'));
  });

  it('castling is two knocks, king then rook', () => {
    const [first, second, ...rest] = startTimes('castle');

    expect(rest).toEqual([]);
    expect((second as number) - (first as number)).toBeGreaterThanOrEqual(0.08);
    expect(schedule('castle').context.bufferSources).toHaveLength(2);
  });

  it('check rings out just after the move that gives it', () => {
    const [first] = startTimes('check');

    expect(first).toBeGreaterThanOrEqual(AT + 0.05);
    expect(first).toBeLessThanOrEqual(AT + 0.2);
    expect(schedule('check').context.bufferSources).toHaveLength(0);
  });

  it('the end of a line is three rising notes', () => {
    const notes = schedule('complete')
      .context.oscillators.map((oscillator) => ({
        at: oscillator.startedAt as number,
        pitch: oscillator.frequency.events[0]?.value as number,
      }))
      .sort((a, b) => a.at - b.at);

    expect(new Set(notes.map((note) => note.at)).size).toBe(3);
    const melody = [...new Map(notes.map((note) => [note.at, note.pitch])).values()];
    expect(melody).toEqual([...melody].sort((a, b) => a - b));
    expect(new Set(melody).size).toBe(3);
  });
});

describe('noise', () => {
  it('is generated once per audio context, however many knocks are played', () => {
    const { context } = schedule('move', 'capture', 'castle', 'move');

    expect(context.bufferSources.length).toBeGreaterThan(3);
    expect(context.buffersCreated).toBe(1);
    expect(new Set(context.bufferSources.map((source) => source.buffer)).size).toBe(1);
  });
});
