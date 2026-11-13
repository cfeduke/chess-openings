/** Small settings that should survive a visit, kept in the browser's local storage. */

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

const PREFIX = 'chess-openings.';

/** Local storage, or nothing where the browser has none or forbids touching it. */
function browserStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** The saved value of `key`, or `fallback` if none was saved or it is not the same kind of value. */
export function readPreference<T extends boolean | number | string>(
  key: string,
  fallback: T,
  storage = browserStorage(),
): T {
  try {
    const saved: unknown = JSON.parse(storage?.getItem(PREFIX + key) ?? 'null');
    return typeof saved === typeof fallback ? (saved as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Saves `value` under `key`, if the browser allows it. */
export function writePreference(
  key: string,
  value: boolean | number | string,
  storage = browserStorage(),
): void {
  try {
    storage?.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage that is full or disabled only costs the visitor a remembered setting.
  }
}
