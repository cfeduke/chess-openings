import { parseOpeningName } from '../../src/catalog/name.ts';
import type { Opening } from '../../src/data/opening.ts';
import type { MostPlayedData, Outcomes } from '../../src/statistics/data.ts';
import { createGame } from './play.ts';
import { BANDS, countsOf, SPEEDS, type Tally } from './tally.ts';
import type { GameTallies } from './vendored.ts';

/** What was counted for the `position`th position in each band of strength, at every speed. */
export function outcomesByBand(tally: Tally, position: number): Outcomes[] {
  return BANDS.map((band) => {
    const sum: Outcomes = [0, 0, 0];
    for (const speed of SPEEDS) {
      const { white, draws, black } = countsOf(tally, position, speed, band);
      sum[0] += white;
      sum[1] += draws;
      sum[2] += black;
    }
    return sum;
  });
}

const gamesIn = (bands: Outcomes[]) =>
  bands.reduce((sum, [white, draws, black]) => sum + white + draws + black, 0);

/**
 * The main line of each family of `openings`: the line named for the family alone, and the
 * shortest of them where transpositions repeat the name. A family without one has none.
 */
export function mainLines(openings: Opening[]): Opening[] {
  const mains = new Map<string, Opening>();
  for (const opening of openings) {
    const { family, variation } = parseOpeningName(opening.name);
    if (variation) continue;
    const shortest = mains.get(family);
    if (!shortest || opening.san.length < shortest.san.length) mains.set(family, opening);
  }
  return [...mains.values()];
}

/**
 * The families of `openings` that can be ranked by how often they are played, the most played
 * first, each as its main line with what was counted for it band by band.
 *
 * Counted by position, the most played are not openings anyone sets out to learn but the ways
 * into them: nearly every game that reaches 1. e4 goes on to be something else. So a family is
 * left out when more than half of the games that reach its main line go on to reach the main
 * line of another family. Those others are the families whose main line passes through this
 * one's position — and of them only the first on each road, the ones that do not pass through
 * another of them, so that a game is not counted again for each family it goes on through.
 * (Roads that meet again still count a game twice, which does not matter to a test against a
 * half.) The rule is applied to all the games together, so that the families ranked are the same
 * whichever band they are ranked for.
 */
export function rankableFamilies(
  openings: Opening[],
  { positions, tally }: GameTallies,
): MostPlayedData['families'] {
  const placeOf = new Map(positions.map((position, place) => [position, place]));
  const game = createGame();

  const families = mainLines(openings).flatMap((opening) => {
    // The positions the line passes through on its way, and the one it ends in.
    const through = new Set<number>();
    game.restart();
    for (const move of opening.san) {
      const place = placeOf.get(game.position());
      if (place !== undefined) through.add(place);
      game.play(move);
    }
    const end = placeOf.get(game.position());
    if (end === undefined) return [];
    const counts = outcomesByBand(tally, end);
    return [{ opening, end, through, counts, games: gamesIn(counts) }];
  });

  return families
    .filter((family) => {
      const beyond = families.filter((other) => other !== family && other.through.has(family.end));
      const next = beyond.filter(
        (other) => !beyond.some((between) => between !== other && other.through.has(between.end)),
      );
      const goingOn = next.reduce((sum, other) => sum + other.games, 0);
      return goingOn * 2 <= family.games;
    })
    .sort((a, b) => b.games - a.games)
    .map(({ opening, counts }) => ({ opening: opening.id, counts }));
}
