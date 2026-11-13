/** An opening name split by the lichess convention `Family: Variation, Subvariation`. */
export interface OpeningName {
  family: string;
  /** Everything after the family; empty for the family's own main line. */
  variation: string;
}

/**
 * The family ends at the first colon — or at the first comma, for the handful of names shaped
 * like `King's Indian Attack, with Bf5`, which belong with the rest of their family.
 */
export function parseOpeningName(name: string): OpeningName {
  const [, family = name, variation = ''] = name.match(/^([^:,]+)[:,]\s*(.*)$/) ?? [];
  return { family, variation };
}
