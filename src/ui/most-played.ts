import './most-played.css';
import type { Catalog, CatalogPlace } from '../catalog/catalog.ts';
import { formatMoveText } from '../chess/san.ts';
import { el } from '../dom.ts';
import type { GamesSource, MostPlayedData } from '../statistics/data.ts';
import {
  bandNames,
  MOST_PLAYED,
  type RankedFamily,
  rankMostPlayed,
} from '../statistics/most-played.ts';
import { percentage } from '../statistics/popularity.ts';
import { monthInWords } from '../text/month.ts';
import { type LeadPage, LINES_REDRAWN } from './catalog.ts';
import { popularityMeter } from './meter.ts';

/**
 * The most played families of `ranking` that `catalog` has, each with where its main line is
 * filed: the first `limit`, ranked by all the games or by those of one band of strength.
 */
export function mostPlayedIn(
  catalog: Catalog,
  ranking: MostPlayedData,
  limit = MOST_PLAYED,
  band?: number,
): { family: RankedFamily; place: CatalogPlace }[] {
  return rankMostPlayed(ranking, band, ranking.families.length)
    .flatMap((family) => {
      const place = catalog.locate(family.opening);
      return place ? [{ family, place }] : [];
    })
    .slice(0, limit);
}

interface MostPlayedOptions {
  catalog: Catalog;
  ranking: MostPlayedData;
  /** The games the ranking was counted from. */
  source: GamesSource;
}

/** One family of the ranking: a line of the catalog, with its rank before it and its figures after. */
function row({ family, place }: ReturnType<typeof mostPlayedIn>[number], rank: number) {
  const { opening } = place;
  const moves = formatMoveText(opening.san);
  const score =
    family.whiteScore === undefined
      ? []
      : [
          'White',
          el('span', { class: 'visually-hidden' }, ' scores'),
          ` ${(family.whiteScore * 100).toFixed(1)}%`,
        ];
  return el(
    'li',
    {},
    el(
      'button',
      { type: 'button', class: 'line ranked', 'data-opening': opening.id, title: moves },
      el('span', { class: 'ranked__rank' }, String(rank)),
      el('span', { class: 'line__name' }, opening.name),
      el('span', { class: 'line__moves' }, moves),
      // The meter says the same figure in words, which is what a screen reader is given.
      el('span', { class: 'ranked__share', 'aria-hidden': 'true' }, percentage(family.share)),
      popularityMeter(family.share),
      el('span', { class: 'ranked__score' }, ...score),
    ),
  );
}

/**
 * The page of the most played openings, for the catalog to put ahead of a collection's
 * sections: the families of `ranking` in order of the share of games that reach them, to be
 * ranked again for the players of one strength.
 */
export function mostPlayedPage({ catalog, ranking, source }: MostPlayedOptions): LeadPage {
  const title = 'Most played';
  const list = el('ol', { class: 'ranking lines', 'aria-label': 'Most played' });

  const option = (value: string, text: string) => el('option', { value }, text);
  const players = el(
    'select',
    { class: 'most-played__players', id: 'most-played-players' },
    option('', 'All players'),
    ...bandNames(ranking.bands).map((name, band) => option(String(band), name)),
  );

  const draw = () => {
    const band = players.value === '' ? undefined : Number(players.value);
    list.replaceChildren(
      ...mostPlayedIn(catalog, ranking, MOST_PLAYED, band).map((family, index) =>
        row(family, index + 1),
      ),
    );
  };
  players.addEventListener('change', () => {
    draw();
    list.dispatchEvent(new Event(LINES_REDRAWN, { bubbles: true }));
  });
  draw();

  const element = el(
    'div',
    { class: 'section most-played' },
    el('h2', { class: 'section__title' }, title),
    el(
      'p',
      { class: 'section__summary' },
      `Opening families by the share of ${source.games.toLocaleString('en')} games on ` +
        `lichess in ${monthInWords(source.month)} that reached them, with White’s score.`,
    ),
    el('p', { class: 'most-played__choice' }, el('label', { for: players.id }, 'Players'), players),
    list,
    el(
      'p',
      { class: 'most-played__note' },
      'A family is reached in every game that passes through its main line, however the game ' +
        'came to it and whatever it went on to be, so the shares do not add up. Families that ' +
        'are mostly ways into others, such as the King’s Pawn Game, are left out. Four games ' +
        'in five are bullet and blitz, and the ratings are lichess’s, which run higher than ' +
        'FIDE’s.',
    ),
  );

  return { id: 'most-played', tab: 'Top', name: 'Top openings', title, element };
}
