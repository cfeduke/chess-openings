import type { OpeningsDataset } from '../../src/data/opening.ts';
import type { PositionCounts, StatisticsData } from '../../src/statistics/data.ts';
import { endOf } from './interest.ts';
import { createGame } from './play.ts';
import { BANDS, countsOf, SPEEDS, type Tally } from './tally.ts';
import type { GameTallies } from './vendored.ts';

/** What the credits call the database the games are from, and where they point to. */
const DATABASE = { title: 'lichess.org open database', url: 'https://database.lichess.org/' };

/** What was counted for the `position`th position, of games of every speed and strength. */
function countsAt(tally: Tally, position: number): PositionCounts {
  const sum: PositionCounts = [0, 0, 0, 0];
  for (const speed of SPEEDS) {
    for (const band of BANDS) {
      const { white, draws, black, expected } = countsOf(tally, position, speed, band);
      sum[0] += white;
      sum[1] += draws;
      sum[2] += black;
      sum[3] += expected;
    }
  }
  sum[3] = Math.round(sum[3]);
  return sum;
}

/**
 * What the site is sent of the tallies to say, at a glance, how much each line of `dataset` is
 * played and how it scores: the counts of each position without the split by speed and strength,
 * and which position each line ends in.
 */
export function buildStatistics(dataset: OpeningsDataset, tallies: GameTallies): StatisticsData {
  const { source, positions, tally } = tallies;
  const placeOf = new Map(positions.map((position, place) => [position, place]));
  const game = createGame();

  const lines = Object.fromEntries(
    dataset.collections.map(({ id, openings }) => [
      id,
      openings.map(({ san }) => placeOf.get(endOf(game, san)) ?? -1),
    ]),
  );

  return {
    source: { ...DATABASE, month: source.month, games: source.counted, license: source.license },
    positions: positions.map((_, place) => countsAt(tally, place)),
    lines,
  };
}
