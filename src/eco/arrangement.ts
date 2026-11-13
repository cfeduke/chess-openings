import type { Arrangement, GroupPlan } from '../catalog/catalog.ts';
import { parseOpeningName } from '../catalog/name.ts';
import type { Opening } from '../data/opening.ts';
import { ECO_VOLUMES, ecoGroupOf, ecoRangeLabel } from './taxonomy.ts';

function byEcoThenNameThenLength(a: Opening, b: Opening): number {
  return a.eco.localeCompare(b.eco) || a.name.localeCompare(b.name) || a.san.length - b.san.length;
}

/** The id of the collection that is laid out this way. */
export const ECO_COLLECTION = 'eco';

/**
 * Lays openings out the way the encyclopaedia does: volume → ECO group → opening family → line.
 * Each group leads with its biggest family, so the opening the group is named after comes first
 * and the stray transpositions filed alongside it come last; ties keep ECO order.
 */
export const ECO_ARRANGEMENT: Arrangement = {
  name: 'ECO',
  title: 'Encyclopaedia of Chess Openings',
  sectionsLabel: 'ECO volumes',
  namesNest: true,

  arrange(openings) {
    const byGroup = Map.groupBy(openings.toSorted(byEcoThenNameThenLength), (opening) =>
      ecoGroupOf(opening.eco),
    );

    return ECO_VOLUMES.map(({ letter, title, summary, groups }) => ({
      id: letter,
      tab: letter,
      name: `Volume ${letter}`,
      title,
      summary,
      groups: groups.flatMap((group): GroupPlan[] => {
        const named = (byGroup.get(group) ?? []).map((opening) => ({
          opening,
          ...parseOpeningName(opening.name),
        }));
        if (named.length === 0) return [];

        const families = [...Map.groupBy(named, (line) => line.family)]
          .map(([name, lines]) => ({
            name,
            lines: lines.map(({ opening, variation }) => ({ opening, variation })),
          }))
          .sort((a, b) => b.lines.length - a.lines.length);
        return [
          {
            id: group.from,
            codes: ecoRangeLabel(group),
            title: group.title,
            moves: group.moves,
            families,
          },
        ];
      }),
    }));
  },
};
