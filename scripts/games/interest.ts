import type { OpeningsDataset } from '../../src/data/opening.ts';
import { createGame, type Game } from './play.ts';

/** What games are read for. */
export interface Interest {
  /** The positions to count games for, each once: the first is the one every game begins in. */
  positions: string[];
  /** How many moves into a game, counting each side's, the last of them can be reached. */
  depth: number;
}

/** The position the moves of a line lead to from the start, played on `game`. */
export function endOf(game: Game, san: readonly string[]): string {
  game.restart();
  for (const move of san) game.play(move);
  return game.position();
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
    positions.add(endOf(game, san));
    depth = Math.max(depth, san.length);
  }
  return { positions: [...positions], depth };
}
