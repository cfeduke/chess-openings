/** Small settings that should survive a visit, kept in the browser's local storage. */

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

/** One remembered setting. */
export interface Preference<T> {
  read(): T;
  write(value: T): void;
}

const PREFIX = 'chess-openings.';

/** Local storage, or nothing where the browser has none or forbids touching it. */
function browserStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Declares a setting: where it is kept, what it is until the visitor chooses, and how to tell a
 * saved value that can be used — `parse` returns it, repaired if need be, or undefined to fall
 * back to `fallback`.
 */
export function preference<T>(
  key: string,
  fallback: T,
  parse: (saved: unknown) => T | undefined,
  storage = browserStorage(),
): Preference<T> {
  return {
    read() {
      try {
        return parse(JSON.parse(storage?.getItem(PREFIX + key) ?? 'null')) ?? fallback;
      } catch {
        return fallback;
      }
    },

    write(value) {
      try {
        storage?.setItem(PREFIX + key, JSON.stringify(value));
      } catch {
        // Storage that is full or disabled only costs the visitor a remembered setting.
      }
    },
  };
}
