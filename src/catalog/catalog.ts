import type { Opening } from '../data/opening.ts';
import { ECO_VOLUMES, type EcoGroup, type EcoVolume, ecoGroupOf } from '../eco/taxonomy.ts';
import { type OpeningName, parseOpeningName } from './name.ts';

/** One opening, with its name split into its family and what distinguishes it within it. */
export interface CatalogLine extends OpeningName {
  opening: Opening;
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

/** Where one opening is filed. */
export interface CatalogPlace {
  opening: Opening;
  volume: CatalogVolume;
  group: CatalogGroup;
  family: CatalogFamily;
  /** The opening's position among `family.lines`. */
  index: number;
}

/** The openings arranged as the encyclopaedia arranges them. */
export interface Catalog {
  /** All five volumes, in order. */
  volumes: CatalogVolume[];
  /** Where the opening with this id is filed, if there is one. */
  locate(id: string): CatalogPlace | undefined;
}

function byEcoThenNameThenLength(a: Opening, b: Opening): number {
  return a.eco.localeCompare(b.eco) || a.name.localeCompare(b.name) || a.san.length - b.san.length;
}

/**
 * Arranges openings the way the encyclopaedia does: volume → ECO group → opening family → line.
 * Each group leads with its biggest family, so the opening the group is named after comes first
 * and the stray transpositions filed alongside it come last; ties keep ECO order.
 */
export function buildCatalog(openings: Opening[]): Catalog {
  const byGroup = Map.groupBy(openings.toSorted(byEcoThenNameThenLength), (opening) =>
    ecoGroupOf(opening.eco),
  );

  const volumes = ECO_VOLUMES.map((volume): CatalogVolume => {
    const groups = volume.groups.flatMap((group): CatalogGroup[] => {
      const lines = (byGroup.get(group) ?? []).map(
        (opening): CatalogLine => ({ opening, ...parseOpeningName(opening.name) }),
      );
      if (lines.length === 0) return [];

      const families = [...Map.groupBy(lines, (line) => line.family)]
        .map(([name, familyLines]) => ({ name, lines: familyLines }))
        .sort((a, b) => b.lines.length - a.lines.length);
      return [{ group, families, count: lines.length }];
    });
    return { volume, groups, count: groups.reduce((sum, group) => sum + group.count, 0) };
  });

  const places = new Map<string, CatalogPlace>();
  for (const volume of volumes) {
    for (const group of volume.groups) {
      for (const family of group.families) {
        family.lines.forEach(({ opening }, index) => {
          places.set(opening.id, { opening, volume, group, family, index });
        });
      }
    }
  }
  return { volumes, locate: (id) => places.get(id) };
}
