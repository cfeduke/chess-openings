import { ECO_ARRANGEMENT } from '../eco/arrangement.ts';
import type { Arrangement } from './catalog.ts';

/** How each collection of the dataset is laid out, by the collection's id. */
export const ARRANGEMENTS: Record<string, Arrangement> = {
  eco: ECO_ARRANGEMENT,
};
