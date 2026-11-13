import type { Opening } from '../../src/data/opening.ts';
import type { Replay } from './replay.ts';

/**
 * Files any line under an ECO code, going by the lines in `named` that already have one: a line
 * gets the code of the last named position it passes through, however it got there. This is how
 * a game is given its opening. Where two named lines end in the same position, the first to
 * name it keeps it.
 *
 * The returned function takes the positions of a line, as `replay` gives them.
 */
export function ecoClassifier(named: Opening[], replay: Replay): (positions: string[]) => string {
  const codes = new Map<string, string>();
  for (const { eco, name, san } of named) {
    const position = replay(name, san.join(' ')).positions.at(-1);
    if (position !== undefined && !codes.has(position)) codes.set(position, eco);
  }

  return (positions) => {
    const last = positions.findLast((position) => codes.has(position));
    const eco = last === undefined ? undefined : codes.get(last);
    if (!eco) throw new Error('a line passes through no named position');
    return eco;
  };
}
