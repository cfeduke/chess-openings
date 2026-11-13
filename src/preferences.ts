/** Small settings that should survive a visit, kept in the browser's local storage. */

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

/** One remembered setting. */
export interface Preference<T> {
  read(): T;
  write(value: T): void;
}

/** A setting kept in storage, which also says under what name. */
export interface StoredPreference<T> extends Preference<T> {
  readonly key: string;
}

/** Local storage, or nothing where the browser has none or forbids touching it. */
function browserStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Declares a setting: what it is called, what it is until the visitor chooses, and how to tell
 * a saved value that can be used — `parse` returns it, repaired if need be, or undefined to
 * fall back to `fallback`. Storage is only looked for when the setting is read or written.
 */
export function preference<T>(
  name: string,
  fallback: T,
  parse: (saved: unknown) => T | undefined,
  findStorage: () => Storage | undefined = browserStorage,
): StoredPreference<T> {
  const key = `chess-openings.${name}`;
  return {
    key,

    read() {
      try {
        return parse(JSON.parse(findStorage()?.getItem(key) ?? 'null')) ?? fallback;
      } catch {
        return fallback;
      }
    },

    write(value) {
      try {
        findStorage()?.setItem(key, JSON.stringify(value));
      } catch {
        // Storage that is full or disabled only costs the visitor a remembered setting.
      }
    },
  };
}
