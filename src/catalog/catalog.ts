import type { DataSource, Opening, OpeningCollection } from '../data/opening.ts';
import { ARRANGEMENTS } from './arrangements.ts';
import type { OpeningName } from './name.ts';

/** One opening, with its name split into its family and what distinguishes it within it. */
export interface CatalogLine extends OpeningName {
  opening: Opening;
}

/** The lines of one opening family that fall inside one group. */
export interface CatalogFamily {
  name: string;
  lines: CatalogLine[];
}

/** Lines that belong together: in the encyclopaedia, those of a run of ECO codes. */
export interface CatalogGroup {
  /** Unique in the whole catalog, and fit to be part of an element's id. */
  id: string;
  /** The codes it covers, such as `B90–B99`. Empty where the collection does not file by code. */
  codes: string;
  title: string;
  /** The moves both sides have played once a game belongs here, in SAN. Empty if there are none. */
  moves: string[];
  families: CatalogFamily[];
  /** Number of lines in the group. */
  count: number;
}

/** One of the parts a collection is divided into: in the encyclopaedia, a volume. */
export interface CatalogSection {
  /** Unique in its collection, and fit to be part of an element's id. */
  id: string;
  /** What its tab says: `A`. */
  tab: string;
  /** What it is called: `Volume A`. */
  name: string;
  title: string;
  summary: string;
  /** Its groups that have at least one opening. */
  groups: CatalogGroup[];
  /** Number of lines in the section. */
  count: number;
}

/** A group as an arrangement gives it: the catalog does the counting. */
export type GroupPlan = Omit<CatalogGroup, 'count'>;

/** A section as an arrangement gives it. */
export type SectionPlan = Omit<CatalogSection, 'groups' | 'count'> & { groups: GroupPlan[] };

/** How the openings of one collection are presented: what it is called, and how it is laid out. */
export interface Arrangement {
  /** What the collection's tab says: `ECO`. */
  name: string;
  /** What the collection is, in full. */
  title: string;
  /** What its sections are, all together: `ECO volumes`. */
  sectionsLabel: string;
  /** Lays the openings out, each exactly once. Sections may be empty; groups may not. */
  arrange(openings: Opening[]): SectionPlan[];
}

/** A body of openings from one source, laid out by its arrangement. */
export interface CatalogCollection extends Omit<Arrangement, 'arrange'> {
  id: string;
  source: DataSource;
  sections: CatalogSection[];
  /** Number of lines in the collection. */
  count: number;
}

/** Where one opening is filed. */
export interface CatalogPlace {
  opening: Opening;
  collection: CatalogCollection;
  section: CatalogSection;
  group: CatalogGroup;
  family: CatalogFamily;
  /** The opening's position among `family.lines`. */
  index: number;
}

/** Every collection of openings, each laid out its own way. */
export interface Catalog {
  /** In the order they are offered. */
  collections: CatalogCollection[];
  /** Where the opening with this id is filed, if there is one. */
  locate(id: string): CatalogPlace | undefined;
}

/** What a line is called among the lines of its family. */
export function lineLabel({ variation }: OpeningName): string {
  return variation || 'Main line';
}

const total = (counted: { count: number }[]) => counted.reduce((sum, { count }) => sum + count, 0);

/**
 * Lays each collection out by the arrangement that goes by its id: collection → section →
 * group → opening family → line.
 */
export function buildCatalog(
  collections: OpeningCollection[],
  arrangements: Record<string, Arrangement> = ARRANGEMENTS,
): Catalog {
  const places = new Map<string, CatalogPlace>();

  const laidOut = collections.map(({ id, source, openings }): CatalogCollection => {
    const arrangement = arrangements[id];
    if (!arrangement) throw new Error(`no arrangement for the collection ${JSON.stringify(id)}`);
    const { arrange, ...about } = arrangement;

    const sections = arrange(openings).map((plan): CatalogSection => {
      const groups = plan.groups.map(
        (group): CatalogGroup => ({
          ...group,
          count: group.families.reduce((sum, family) => sum + family.lines.length, 0),
        }),
      );
      return { ...plan, groups, count: total(groups) };
    });
    const collection = { ...about, id, source, sections, count: total(sections) };

    for (const section of sections) {
      for (const group of section.groups) {
        for (const family of group.families) {
          family.lines.forEach(({ opening }, index) => {
            places.set(opening.id, { opening, collection, section, group, family, index });
          });
        }
      }
    }
    return collection;
  });

  return { collections: laidOut, locate: (id) => places.get(id) };
}
