import type { OpeningsDataset } from '../../src/data/opening.ts';
import { ECO_COLLECTION } from '../../src/eco/arrangement.ts';
import type { PositionCounts, StatisticsData } from '../../src/statistics/data.ts';
import { detailIndex } from './detail.ts';
import { endOf } from './interest.ts';
import { rankableFamilies } from './most-played.ts';
import { outcomesByBand } from './outcomes.ts';
import { createGame } from './play.ts';
import { BANDS, countsOver, type Tally } from './tally.ts';
import type { GameTallies } from './vendored.ts';

/** What the credits call the database the games are from, and where they point to. */
const DATABASE = { title: 'lichess.org open database', url: 'https://database.lichess.org/' };

/** What was counted for the `position`th position, of games of every speed and strength. */
function countsAt(tally: Tally, position: number): PositionCounts {
  const { white, draws, black, expected } = countsOver(tally, position);
  return [white, draws, black, Math.round(expected)];
}

/**
 * What the site is sent of the tallies to say, at a glance, how much each line of `dataset` is
 * played and how it scores: the counts of each position without the split by speed and strength,
 * and which position each line ends in — and, to rank the encyclopaedia's families by how often
 * they are played, the counts of each family's main line band by band.
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

  // Only the encyclopaedia's names say which family a line is of.
  const encyclopaedia = dataset.collections.find(({ id }) => id === ECO_COLLECTION);

  return {
    source: { ...DATABASE, month: source.month, games: source.counted, license: source.license },
    positions: positions.map((_, place) => countsAt(tally, place)),
    lines,
    detail: detailIndex(tally),
    ...(encyclopaedia && {
      mostPlayed: {
        collection: encyclopaedia.id,
        bands: [...BANDS],
        totals: outcomesByBand(tally, 0),
        families: rankableFamilies(encyclopaedia.openings, tallies),
      },
    }),
  };
}
