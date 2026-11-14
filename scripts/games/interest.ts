import type { OpeningsDataset } from '../../src/data/opening.ts';
import { createGame } from './play.ts';

/** What games are read for. */
export interface Interest {
  /** The positions to count games for, each once: the first is the one every game begins in. */
  positions: string[];
  /** How many moves into a game, counting each side's, the last of them can be reached. */
  depth: number;
}

/**
 * The positions a catalog gives reason to count games for: the one each line of each collection
 * ends in, after the one all of them begin in, which every game counts for.
 */
export function positionsOfInterest(dataset: OpeningsDataset): Interest {
  const game = createGame();
  const positions = new Set([game.position()]);
  let depth = 0;
  for (const { san } of dataset.collections.flatMap((collection) => collection.openings)) {
    game.restart();
    for (const move of san) game.play(move);
    positions.add(game.position());
    depth = Math.max(depth, san.length);
  }
  return { positions: [...positions], depth };
}
