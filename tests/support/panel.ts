import { buildCatalog, fullName } from '../../src/catalog/catalog.ts';
import type { Opening } from '../../src/data/opening.ts';
import type { DetailIndex, PositionDetail } from '../../src/statistics/data.ts';
import { detailOf, type OpeningDetail } from '../../src/statistics/detail.ts';
import { type LineNumbers, readStatistics } from '../../src/statistics/statistics.ts';
import type { PanelSubject } from '../../src/ui/statistics-panel.ts';
import { SMALL_DATASET } from './openings.ts';
import { SMALL_DETAIL, SMALL_STATISTICS } from './statistics.ts';

const catalog = buildCatalog(SMALL_DATASET.collections);
const statistics = readStatistics(SMALL_STATISTICS, SMALL_DATASET.collections);

/** The detail of the small statistics' position at `place`, as the panel is given it. */
export const smallDetail = (place: number): OpeningDetail =>
  detailOf(SMALL_DETAIL[place] as PositionDetail, SMALL_STATISTICS.detail as DetailIndex);

/**
 * What the panel is given to show `opening` of the small book by the small statistics, its
 * detail coming at once unless `detail` says how — or, with `null`, not being there to come.
 */
export function subjectOf(
  opening: Opening,
  detail: (() => Promise<OpeningDetail>) | null = async () =>
    smallDetail(statistics.placeOf(opening) ?? -1),
): PanelSubject {
  return {
    numbers: statistics.of(opening) as LineNumbers,
    total: statistics.total,
    source: statistics.source,
    plies: opening.san.length,
    ...(detail && { detail }),
    leadsTo(place) {
      const [line] = statistics.linesAt(place);
      const filed = line && catalog.locate(line.id);
      return filed && { opening: filed.opening, name: fullName(filed) };
    },
  };
}
