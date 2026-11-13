import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asAudioContext, FakeAudioContext } from '../../tests/support/fake-audio.ts';
import { createSoundEffects } from './sound-effects.ts';

function setup(options: { muted?: boolean } = {}) {
  const context = new FakeAudioContext();
  const createContext = vi.fn(() => asAudioContext(context));
  const saved = { muted: options.muted ?? false };
  const sounds = createSoundEffects({
    createContext,
    muted: {
      read: () => saved.muted,
      write(muted) {
        saved.muted = muted;
      },
    },
  });
  return { context, createContext, saved, sounds };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('before the first user gesture', () => {
  it('creates no audio context: browsers refuse to start one uninvited', () => {
    const { createContext, sounds } = setup();

    sounds.play('move');

    expect(createContext).not.toHaveBeenCalled();
  });
});

describe('wake, called on a user gesture', () => {
  it('creates the audio context and starts it', () => {
    const { context, createContext, sounds } = setup();

    sounds.wake();

    expect(createContext).toHaveBeenCalledTimes(1);
    expect(context.state).toBe('running');
  });

  it('only ever creates one', () => {
    const { createContext, sounds } = setup();

    sounds.wake();
    sounds.wake();

    expect(createContext).toHaveBeenCalledTimes(1);
  });

  it('shrugs off a browser that still refuses to start', async () => {
    const { context, sounds } = setup();
    context.refusesToResume = true;

    sounds.wake();
    await Promise.resolve();
    sounds.play('move');

    expect(context.sources).toEqual([]);
  });
});

describe('play', () => {
  it('schedules the cue a moment ahead, through one master volume, to the speakers', () => {
    const { context, sounds } = setup();
    sounds.wake();
    const [master] = context.gains;

    sounds.play('move');

    expect(context.sources.length).toBeGreaterThan(0);
    for (const source of context.sources) {
      expect(source.startedAt).toBeGreaterThan(context.currentTime);
      expect(source.startedAt).toBeLessThan(context.currentTime + 0.05);
      expect(master && source.reaches(master)).toBe(true);
    }
    expect(master?.reaches(context.destination)).toBe(true);
    expect(master?.gain.value).toBeGreaterThan(0);
    expect(master?.gain.value).toBeLessThanOrEqual(1);
  });

  it('stays quiet while the audio context is not running, rather than queueing sounds up', () => {
    const { context, sounds } = setup();
    sounds.wake();
    context.state = 'suspended';

    sounds.play('move');

    expect(context.sources).toEqual([]);
  });
});

describe('going back to sleep', () => {
  it('happens after twenty seconds with nothing to play, to spare the battery', () => {
    const { context, sounds } = setup();
    sounds.wake();

    vi.advanceTimersByTime(19_999);
    expect(context.state).toBe('running');

    vi.advanceTimersByTime(1);
    expect(context.state).toBe('suspended');
  });

  it('is put off by every cue', () => {
    const { context, sounds } = setup();
    sounds.wake();

    vi.advanceTimersByTime(15_000);
    sounds.play('move');
    vi.advanceTimersByTime(15_000);
    expect(context.state).toBe('running');

    vi.advanceTimersByTime(5_000);
    expect(context.state).toBe('suspended');
  });

  it('ends at the next gesture', () => {
    const { context, sounds } = setup();
    sounds.wake();
    vi.advanceTimersByTime(20_000);

    sounds.wake();
    sounds.play('move');

    expect(context.state).toBe('running');
    expect(context.sources.length).toBeGreaterThan(0);
  });
});

describe('muting', () => {
  it('is as it was left on the last visit', () => {
    expect(setup().sounds.muted).toBe(false);
    expect(setup({ muted: true }).sounds.muted).toBe(true);
  });

  it('means not even starting the audio engine', () => {
    const { createContext, sounds } = setup({ muted: true });

    sounds.wake();
    sounds.play('capture');

    expect(createContext).not.toHaveBeenCalled();
  });

  it('silences an engine that is already running', () => {
    const { context, sounds } = setup();
    sounds.wake();

    sounds.setMuted(true);
    sounds.play('move');

    expect(sounds.muted).toBe(true);
    expect(context.sources).toEqual([]);
  });

  it('switched off starts the engine there and then: the switch is itself a gesture', () => {
    const { context, sounds } = setup({ muted: true });

    sounds.setMuted(false);
    sounds.play('move');

    expect(sounds.muted).toBe(false);
    expect(context.state).toBe('running');
    expect(context.sources.length).toBeGreaterThan(0);
  });

  it('is remembered', () => {
    const { saved, sounds } = setup();

    sounds.setMuted(true);
    expect(saved.muted).toBe(true);

    sounds.setMuted(false);
    expect(saved.muted).toBe(false);
  });
});

describe('without Web Audio', () => {
  it('does nothing, quietly', () => {
    const sounds = createSoundEffects({ createContext: () => undefined });

    expect(() => {
      sounds.wake();
      sounds.play('move');
      sounds.setMuted(true);
      sounds.setMuted(false);
    }).not.toThrow();
  });

  it('is what you get by default where there is no AudioContext, as in Node', () => {
    const sounds = createSoundEffects();

    expect(() => {
      sounds.wake();
      sounds.play('complete');
    }).not.toThrow();
    expect(sounds.muted).toBe(false);
  });
});
