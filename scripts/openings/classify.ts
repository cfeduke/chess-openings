import type { Opening } from '../../src/data/opening.ts';
import type { Replay } from './replay.ts';

/** Files a line under an ECO code, given the positions it passes through as `replay` gives them. */
export type EcoOf = (positions: string[]) => string;

/**
 * Files any line under an ECO code, going by the lines in `named` that already have one: a line
 * gets the code of the last named position it passes through, however it got there. This is how
 * a game is given its opening. Where two named lines end in the same position, the first to
 * name it keeps it.
 */
export function ecoClassifier(named: Opening[], replay: Replay): EcoOf {
  const codes = new Map<string, string>();
  for (const { eco, name, san } of named) {
    const position = replay(name, san.join(' ')).positions.at(-1);
    if (position !== undefined && !codes.has(position)) codes.set(position, eco);
  }

  return (positions) => {
    for (const position of positions.toReversed()) {
      const eco = codes.get(position);
      if (eco) return eco;
    }
    throw new Error('a line passes through no named position');
  };
}
