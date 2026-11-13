import { clampDelay, DEFAULT_DELAY_MS } from './playback/schedule.ts';
import { preference } from './preferences.ts';

/** What the site remembers about a visitor between visits. */

export const mutedSetting = preference('muted', false, (saved) =>
  typeof saved === 'boolean' ? saved : undefined,
);

export const delaySetting = preference('delayMs', DEFAULT_DELAY_MS, (saved) =>
  typeof saved === 'number' ? clampDelay(saved) : undefined,
);

/**
 * The id of the appearance the visitor chose for the board, or none. Which appearances there are
 * is for whoever reads it to say — and so is what to do with an id that is no longer one of them.
 */
export const appearanceSetting = preference('appearance', '', (saved) =>
  typeof saved === 'string' ? saved : undefined,
);
