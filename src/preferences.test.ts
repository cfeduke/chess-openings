import { afterEach, describe, expect, it, vi } from 'vitest';
import { preference } from './preferences.ts';

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

const boolean = (saved: unknown) => (typeof saved === 'boolean' ? saved : undefined);
/** A number, pulled back into 1–10. */
const level = (saved: unknown) =>
  typeof saved === 'number' ? Math.min(10, Math.max(1, saved)) : undefined;

describe('a preference', () => {
  it('is its default until something has been saved', () => {
    const { storage } = fakeStorage();

    expect(preference('muted', false, boolean, storage).read()).toBe(false);
    expect(preference('level', 5, level, storage).read()).toBe(5);
  });

  it('comes back as it was saved, on this visit and the next', () => {
    const { storage } = fakeStorage();

    preference('muted', false, boolean, storage).write(true);

    expect(preference('muted', false, boolean, storage).read()).toBe(true);
  });

  it('is stored under a name of its own, clear of anything else on the origin', () => {
    const { data, storage } = fakeStorage();

    preference('level', 5, level, storage).write(7);

    expect([...data]).toEqual([['chess-openings.level', '7']]);
  });

  it.each([
    ['not JSON at all', 'banana'],
    ['the wrong kind of value', '"yes"'],
    ['nothing', 'null'],
  ])('is its default when what was saved is %s', (_, saved) => {
    const { storage } = fakeStorage({ 'chess-openings.muted': saved });

    expect(preference('muted', false, boolean, storage).read()).toBe(false);
  });

  it('is repaired, if it can be, when what was saved is out of range', () => {
    const { storage } = fakeStorage({ 'chess-openings.level': '9000' });

    expect(preference('level', 5, level, storage).read()).toBe(10);
  });

  it('is its default when the browser will not let the page read it', () => {
    expect(preference('muted', true, boolean, brokenStorage).read()).toBe(true);
  });

  it('is quietly not saved when the browser will not let the page write it', () => {
    expect(() => preference('muted', false, boolean, brokenStorage).write(true)).not.toThrow();
  });
});

describe('a preference, left to find the browser’s storage itself', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  afterEach(() => {
    vi.unstubAllGlobals();
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
  });

  it('uses local storage', () => {
    const { data, storage } = fakeStorage();
    vi.stubGlobal('localStorage', storage);

    preference('muted', false, boolean).write(true);

    expect(data.get('chess-openings.muted')).toBe('true');
  });

  it('does without where there is none', () => {
    vi.stubGlobal('localStorage', undefined);
    const muted = preference('muted', false, boolean);

    expect(() => muted.write(true)).not.toThrow();
    expect(muted.read()).toBe(false);
  });

  it('does without where the browser refuses access to it', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
    const muted = preference('muted', false, boolean);

    expect(() => muted.write(true)).not.toThrow();
    expect(muted.read()).toBe(false);
  });
});
