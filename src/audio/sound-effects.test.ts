import { describe, expect, it, vi } from 'vitest';
import { asAudioContext, FakeAudioContext } from '../../tests/support/fake-audio.ts';
import { createSoundEffects } from './sound-effects.ts';

function setup(options: { muted?: boolean } = {}) {
  const context = new FakeAudioContext();
  const createContext = vi.fn(() => asAudioContext(context));
  const sounds = createSoundEffects({ ...options, createContext });
  return { context, createContext, sounds };
}

describe('before the first user gesture', () => {
  it('creates no audio context: browsers refuse to start one uninvited', () => {
    const { createContext, sounds } = setup();

    sounds.play('move');

    expect(createContext).not.toHaveBeenCalled();
  });
});

describe('unlock', () => {
  it('creates the audio context and starts it', () => {
    const { context, createContext, sounds } = setup();

    sounds.unlock();

    expect(createContext).toHaveBeenCalledTimes(1);
    expect(context.state).toBe('running');
  });

  it('only ever creates one', () => {
    const { createContext, sounds } = setup();

    sounds.unlock();
    sounds.unlock();

    expect(createContext).toHaveBeenCalledTimes(1);
  });

  it('shrugs off a browser that still refuses to start', async () => {
    const { context, sounds } = setup();
    context.refusesToResume = true;

    sounds.unlock();
    await Promise.resolve();
    sounds.play('move');

    expect(context.sources).toEqual([]);
  });
});

describe('play', () => {
  it('schedules the cue a moment ahead, through one master volume, to the speakers', () => {
    const { context, sounds } = setup();
    sounds.unlock();
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

  it('plays every cue the player can name', () => {
    const { context, sounds } = setup();
    sounds.unlock();

    for (const cue of ['move', 'capture', 'castle', 'check', 'complete'] as const) {
      const before = context.sources.length;
      sounds.play(cue);
      expect(context.sources.length, cue).toBeGreaterThan(before);
    }
  });

  it('stays quiet while the audio context is not running', () => {
    const { context, sounds } = setup();
    sounds.unlock();
    context.state = 'suspended';

    sounds.play('move');

    expect(context.sources).toEqual([]);
  });
});

describe('muting', () => {
  it('is off unless asked for', () => {
    expect(setup().sounds.muted).toBe(false);
    expect(setup({ muted: true }).sounds.muted).toBe(true);
  });

  it('schedules nothing while muted', () => {
    const { context, sounds } = setup({ muted: true });
    sounds.unlock();

    sounds.play('capture');

    expect(context.sources).toEqual([]);
  });

  it('can be switched on and off', () => {
    const { context, sounds } = setup();
    sounds.unlock();

    sounds.setMuted(true);
    sounds.play('move');
    expect(sounds.muted).toBe(true);
    expect(context.sources).toEqual([]);

    sounds.setMuted(false);
    sounds.play('move');
    expect(sounds.muted).toBe(false);
    expect(context.sources.length).toBeGreaterThan(0);
  });

  it('still unlocks, so that unmuting later needs no second gesture', () => {
    const { context, sounds } = setup({ muted: true });

    sounds.unlock();

    expect(context.state).toBe('running');
  });
});

describe('without Web Audio', () => {
  it('does nothing, quietly', () => {
    const sounds = createSoundEffects({ createContext: () => undefined });

    expect(() => {
      sounds.unlock();
      sounds.play('move');
      sounds.setMuted(true);
    }).not.toThrow();
  });

  it('is what you get by default where there is no AudioContext, as in Node', () => {
    const sounds = createSoundEffects();

    expect(() => {
      sounds.unlock();
      sounds.play('complete');
    }).not.toThrow();
  });
});
