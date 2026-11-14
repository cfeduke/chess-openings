import type { Outcomes } from '../../src/statistics/data.ts';
import { BANDS, type Band, countsOver, SPEEDS, type Speed, type Tally } from './tally.ts';

/** How the games of these speeds and bands that reached the `position`th position went. */
function outcomesIn(
  tally: Tally,
  position: number,
  speeds: readonly Speed[],
  bands: readonly Band[],
): Outcomes {
  const { white, draws, black } = countsOver(tally, position, speeds, bands);
  return [white, draws, black];
}

/** What was counted for the `position`th position in each band of strength, at every speed. */
export const outcomesByBand = (tally: Tally, position: number): Outcomes[] =>
  BANDS.map((band) => outcomesIn(tally, position, SPEEDS, [band]));

/** What was counted for it at each speed, in every band of strength. */
export const outcomesBySpeed = (tally: Tally, position: number): Outcomes[] =>
  SPEEDS.map((speed) => outcomesIn(tally, position, [speed], BANDS));
