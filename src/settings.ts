import { clampDelay, DEFAULT_DELAY_MS } from './playback/schedule.ts';
import { preference } from './preferences.ts';

/** What the site remembers about a visitor between visits. */

export const mutedSetting = preference('muted', false, (saved) =>
  typeof saved === 'boolean' ? saved : undefined,
);

export const delaySetting = preference('delayMs', DEFAULT_DELAY_MS, (saved) =>
  typeof saved === 'number' ? clampDelay(saved) : undefined,
);
