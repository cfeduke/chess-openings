import type { Opening } from '../data/opening.ts';
import { ECO_VOLUMES, type EcoGroup, type EcoVolume, ecoGroupOf } from '../eco/taxonomy.ts';
import { parseOpeningName } from './name.ts';

/** One opening, labelled by what distinguishes it within its family. */
export interface CatalogLine {
  opening: Opening;
  /** Empty for the family's main line. */
  variation: string;
}

/** The lines of one opening family that fall inside one ECO group. */
export interface CatalogFamily {
  name: string;
  lines: CatalogLine[];
}

export interface CatalogGroup {
  group: EcoGroup;
  families: CatalogFamily[];
  /** Number of lines in the group. */
  count: number;
}

export interface CatalogVolume {
  volume: EcoVolume;
  /** The volume's groups that have at least one opening. */
  groups: CatalogGroup[];
  /** Number of lines in the volume. */
  count: number;
}

function byEcoThenNameThenLength(a: Opening, b: Opening): number {
  return a.eco.localeCompare(b.eco) || a.name.localeCompare(b.name) || a.san.length - b.san.length;
}

/**
 * Arranges openings the way the encyclopaedia does: volume → ECO group → opening family → line.
 * Each group leads with its biggest family, so the opening the group is named after comes first
 * and the stray transpositions filed alongside it come last; ties keep ECO order.
 */
export function buildCatalog(openings: Opening[]): CatalogVolume[] {
  const byGroup = Map.groupBy(openings.toSorted(byEcoThenNameThenLength), (opening) =>
    ecoGroupOf(opening.eco),
  );

  return ECO_VOLUMES.map((volume) => {
    const groups = volume.groups.flatMap((group): CatalogGroup[] => {
      const lines = (byGroup.get(group) ?? []).map((opening) => ({
        opening,
        ...parseOpeningName(opening.name),
      }));
      if (lines.length === 0) return [];

      const families = [...Map.groupBy(lines, (line) => line.family)]
        .map(([name, familyLines]) => ({
          name,
          lines: familyLines.map(({ opening, variation }) => ({ opening, variation })),
        }))
        .sort((a, b) => b.lines.length - a.lines.length);
      return [{ group, families, count: lines.length }];
    });
    return { volume, groups, count: groups.reduce((sum, group) => sum + group.count, 0) };
  });
}
