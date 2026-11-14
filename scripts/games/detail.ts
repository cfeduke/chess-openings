import type { OpeningsDataset } from '../../src/data/opening.ts';
import type { DetailChunk, DetailIndex, PositionDetail } from '../../src/statistics/data.ts';
import { endOf } from './interest.ts';
import { outcomesByBand, outcomesBySpeed } from './outcomes.ts';
import { createGame } from './play.ts';
import { BANDS, countsOf, movesFrom, SPEEDS, type Tally } from './tally.ts';
import type { GameTallies } from './vendored.ts';

/**
 * How many positions there are to a file of detail. All of it is too much to fetch for one
 * opening; a few hundred positions are some tens of kilobytes.
 */
export const DETAIL_CHUNK = 256;

/** How the detail is cut up, and what the games of any position are a share of. */
export function detailIndex(tally: Tally): DetailIndex {
  return {
    size: DETAIL_CHUNK,
    bands: [...BANDS],
    speeds: [...SPEEDS],
    totals: { bands: outcomesByBand(tally, 0), speeds: outcomesBySpeed(tally, 0) },
  };
}

/**
 * What the site is sent, a file at a time, of each position beyond the glance: how its games
 * went band by band and speed by speed, the moves played next and where each leads, and how
 * long the games were. The files are in order, and so are the positions in each.
 */
export function buildDetail(dataset: OpeningsDataset, tallies: GameTallies): DetailChunk[] {
  const { positions, tally } = tallies;
  const placeOf = new Map(positions.map((position, place) => [position, place]));
  const game = createGame();

  // A line that leads to each position: where a move from it leads is found by playing on.
  const lineTo = new Map<number, string[]>([[0, []]]);
  for (const { san } of dataset.collections.flatMap((collection) => collection.openings)) {
    const place = placeOf.get(endOf(game, san));
    if (place !== undefined && !lineTo.has(place)) lineTo.set(place, san);
  }
  const leadsTo = (line: string[] | undefined, move: string) => {
    if (!line) return -1;
    endOf(game, line);
    game.play(move);
    return placeOf.get(game.position()) ?? -1;
  };

  const details = positions.map((_, place): PositionDetail => {
    let plies = 0;
    let short = 0;
    for (const speed of SPEEDS) {
      for (const band of BANDS) {
        const counts = countsOf(tally, place, speed, band);
        plies += counts.plies;
        short += counts.short;
      }
    }
    const line = lineTo.get(place);
    return {
      bands: outcomesByBand(tally, place),
      speeds: outcomesBySpeed(tally, place),
      moves: movesFrom(tally, place).map(([san, games]) => [san, games, leadsTo(line, san)]),
      plies,
      short,
    };
  });

  return Array.from({ length: Math.ceil(details.length / DETAIL_CHUNK) }, (_, chunk) =>
    details.slice(chunk * DETAIL_CHUNK, (chunk + 1) * DETAIL_CHUNK),
  );
}
