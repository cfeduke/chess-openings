/** How many steps the scale of how often a line is played has. */
export const POPULARITY_STEPS = 5;

/**
 * How often a line is played, on a scale of factors of ten: a step for 1 game in 100,000, one
 * more for 1 in 10,000, and so on up to five for 1 in 10. The lines of a catalog run from most
 * of all games to none of them, and all but a few dozen would be nothing on a linear scale.
 */
export function popularityOf(share: number): number {
  let steps = 0;
  // Compared as "one game in so many", which a factor of ten is exactly; 0.1 ** 5 is not.
  for (let oneIn = 10 ** POPULARITY_STEPS; steps < POPULARITY_STEPS; oneIn /= 10) {
    if (share * oneIn < 1) break;
    steps++;
  }
  return steps;
}

/** The smallest share that is said as a percentage: below it the percentage is all noughts. */
const SMALLEST_PERCENTAGE = 0.001;

const twoFigures = (number: number) => Number(number.toPrecision(2));

/** A share as a percentage to two figures: `9.2%`. */
export const percentage = (share: number) => `${twoFigures(share * 100)}%`;

/** A share that is not nothing, as it is best said: `9.2%`, or `1 game in 50,000`. */
export const shareInWords = (share: number) =>
  share >= SMALLEST_PERCENTAGE
    ? percentage(share)
    : `1 game in ${twoFigures(1 / share).toLocaleString('en')}`;

/** A share of the games in words: `9.2% of games`, `1 game in 50,000`, `No games`. */
export function describeShare(share: number): string {
  if (share <= 0) return 'No games';
  return share >= SMALLEST_PERCENTAGE ? `${shareInWords(share)} of games` : shareInWords(share);
}
