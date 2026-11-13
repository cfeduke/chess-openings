import { describe, expect, it } from 'vitest';
import { readPreference, writePreference } from './preferences.ts';

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
  return { data, storage };
}

const brokenStorage = {
  getItem: () => {
    throw new Error('storage is disabled');
  },
  setItem: () => {
    throw new Error('storage is full');
  },
};

describe('preferences', () => {
  it('fall back to the default when nothing has been saved', () => {
    const { storage } = fakeStorage();

    expect(readPreference('muted', false, storage)).toBe(false);
    expect(readPreference('delayMs', 1500, storage)).toBe(1500);
  });

  it('come back as they were saved', () => {
    const { storage } = fakeStorage();

    writePreference('muted', true, storage);
    writePreference('delayMs', 800, storage);

    expect(readPreference('muted', false, storage)).toBe(true);
    expect(readPreference('delayMs', 1500, storage)).toBe(800);
  });

  it('are stored under names of their own, clear of anything else on the origin', () => {
    const { data, storage } = fakeStorage();

    writePreference('muted', true, storage);

    expect([...data.keys()]).toEqual(['chess-openings.muted']);
  });

  it.each([
    ['not JSON at all', 'banana'],
    ['the wrong kind of value', '"yes"'],
    ['nothing', 'null'],
  ])('fall back to the default when what was saved is %s', (_, saved) => {
    const { storage } = fakeStorage({ 'chess-openings.muted': saved });

    expect(readPreference('muted', false, storage)).toBe(false);
  });

  it('fall back to the default when the browser will not let the page read them', () => {
    expect(readPreference('muted', true, brokenStorage)).toBe(true);
  });

  it('are quietly not saved when the browser will not let the page write them', () => {
    expect(() => writePreference('muted', true, brokenStorage)).not.toThrow();
  });

  it('do without storage altogether', () => {
    expect(readPreference('muted', false, undefined)).toBe(false);
    expect(() => writePreference('muted', true, undefined)).not.toThrow();
  });
});
