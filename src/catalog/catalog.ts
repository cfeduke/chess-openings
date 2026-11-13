import type { Opening, OpeningCollection } from '../data/opening.ts';
import { ARRANGEMENTS } from './arrangements.ts';
import { createSearch, type SearchResult } from './search.ts';

/** One opening, as a line of its family. */
export interface CatalogLine {
  opening: Opening;
  /** What distinguishes it within the family; empty for the family's own main line. */
  variation: string;
}

/** The lines of one opening family that fall inside one group. */
export interface CatalogFamily {
  name: string;
  lines: CatalogLine[];
}

/** Lines that belong together: in the encyclopaedia, those of a run of ECO codes. */
export interface CatalogGroup {
  /** Unique in its collection, and fit to be part of an element's id. */
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
  /**
   * Whether a line's name says which line it is, a longer name meaning a more specific line, as
   * lichess's names do. Where it does not, many lines share a name: a search puts the shortest
   * of them first, and what tells one from another has to be added to say which is meant.
   */
  namesNest: boolean;
  /** Lays the openings out, each exactly once. Sections may be empty; groups may not. */
  arrange(openings: Opening[]): SectionPlan[];
  /**
   * Where a line can be read about, for a collection that has such a place: what to call the
   * link, and where it leads.
   */
  readMore?(opening: Opening): { label: string; href: string } | undefined;
}

/** A body of openings from one source, laid out by its arrangement. */
export interface CatalogCollection extends Omit<Arrangement, 'arrange'> {
  id: string;
  sections: CatalogSection[];
  /** Number of lines in the collection. */
  count: number;
  /** Finds its lines by name, ECO code or moves: the best `limit` of them, and how many in all. */
  search(query: string, limit?: number): SearchResult;
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
  /** Number of lines in all of them. */
  count: number;
  /** Where the opening with this id is filed, if there is one. */
  locate(id: string): CatalogPlace | undefined;
}

/** What a line is called among the lines of its family. */
export function lineLabel({ variation }: Pick<CatalogLine, 'variation'>): string {
  return variation || 'Main line';
}

/**
 * What the opening at a place is called, in full. Where many lines share a name, that is the
 * name and what tells the line from the rest of its family, written as lichess would write it.
 */
export function fullName({ opening, collection, family, index }: CatalogPlace): string {
  const variation = family.lines[index]?.variation;
  return collection.namesNest || !variation ? opening.name : `${opening.name}: ${variation}`;
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

  const laidOut = collections.map(({ id, openings }): CatalogCollection => {
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
    // Getting a collection ready to be searched takes a moment, and the page is waiting to be
    // drawn: it is left until someone searches.
    let search: ReturnType<typeof createSearch> | undefined;
    const collection: CatalogCollection = {
      ...about,
      id,
      sections,
      count: total(sections),
      search(query, limit) {
        search ??= createSearch(openings, about);
        return search(query, limit);
      },
    };

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

  return { collections: laidOut, count: total(laidOut), locate: (id) => places.get(id) };
}
