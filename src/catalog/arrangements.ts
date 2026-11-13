import { ECO_ARRANGEMENT, ECO_COLLECTION } from '../eco/arrangement.ts';
import type { Arrangement } from './catalog.ts';

/** How each collection of the dataset is laid out, by the collection's id. */
export const ARRANGEMENTS: Record<string, Arrangement> = {
  [ECO_COLLECTION]: ECO_ARRANGEMENT,
};
