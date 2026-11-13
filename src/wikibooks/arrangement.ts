/**
 * Wikibooks' Chess Opening Theory has a page for each position it discusses, reached by the
 * moves in the page's title, so the book is a tree: the pages that follow from a page are the
 * replies it goes on to consider. This lays the catalog out along that tree.
 */
import type { Arrangement, CatalogFamily, GroupPlan, SectionPlan } from '../catalog/catalog.ts';
import { formatMoveText } from '../chess/san.ts';
import type { Opening } from '../data/opening.ts';
import { foldWords } from '../text/fold.ts';

/** The id of the collection that is laid out this way. */
export const WIKIBOOKS_COLLECTION = 'wikibooks';

/** The most lines a group may hold: about as many as the biggest of the encyclopaedia's. */
export const GROUP_LIMIT = 120;

/** The first moves that have a section to themselves; every other shares the last section. */
const SECTIONS = [
  {
    id: 'e4',
    tab: '1. e4',
    name: '1. e4',
    title: 'King’s Pawn Openings',
    summary:
      'Everything the book has after 1. e4: the open games that follow 1… e5, and the Sicilian, ' +
      'the French, the Caro-Kann and Black’s other ways of answering.',
  },
  {
    id: 'd4',
    tab: '1. d4',
    name: '1. d4',
    title: 'Queen’s Pawn Openings',
    summary:
      'Everything the book has after 1. d4: the closed games that follow 1… d5, the Queen’s ' +
      'Gambit among them, and the Indian defences that follow 1… Nf6.',
  },
  {
    id: 'other',
    tab: 'Other',
    name: 'Other first moves',
    title: 'Flank & Irregular Openings',
    summary:
      'Every other way of starting the game, from the English and 1. Nf3 down to the first ' +
      'moves that are only ever played for a dare.',
  },
] as const;

/** A page of the book, with the pages that follow from it. */
interface Page {
  opening: Opening;
  /** Biggest first: the replies the book has most to say about. */
  children: Page[];
  /** How many pages there are from here down, this one included. */
  size: number;
}

const movesOf = ({ opening }: Page) => opening.san.join(' ');

/** Bigger branches first; branches of a size in the order of their moves. */
const inReadingOrder = (a: Page, b: Page) => b.size - a.size || (movesOf(a) < movesOf(b) ? -1 : 1);

/**
 * Joins the pages up into trees and returns their roots. A page follows from the page for the
 * line one move shorter — or, where the book has no such page, from the nearest one it has.
 */
function growTrees(openings: Opening[]): Page[] {
  const pages = new Map(
    openings.map((opening): [string, Page] => [
      opening.san.join(' '),
      { opening, children: [], size: 1 },
    ]),
  );

  const roots: Page[] = [];
  for (const page of pages.values()) {
    const { san } = page.opening;
    let parent: Page | undefined;
    for (let plies = san.length - 1; plies > 0 && !parent; plies--) {
      parent = pages.get(san.slice(0, plies).join(' '));
    }
    (parent?.children ?? roots).push(page);
  }

  const measure = (page: Page): number => {
    page.size = 1 + page.children.reduce((sum, child) => sum + measure(child), 0);
    page.children.sort(inReadingOrder);
    return page.size;
  };
  roots.forEach(measure);
  return roots.sort(inReadingOrder);
}

/** A page and every page under it, as a book would print them: each page before what follows. */
const branch = (page: Page): Page[] => [page, ...page.children.flatMap(branch)];

/** The pages that make up a group, the first being the one the group is named after. */
type Cut = Page[];

/**
 * Cuts a branch into groups of no more than `limit` pages. A branch that is too big gives up its
 * biggest branches, one at a time, until what is left of it fits; each branch given up is cut
 * in the same way. The groups come out in reading order.
 */
function cut(page: Page, limit: number): Cut[] {
  let left = page.size;
  const kept: Page[] = [];
  const givenUp: Page[] = [];
  for (const child of page.children) {
    if (left > limit) {
      givenUp.push(child);
      left -= child.size;
    } else {
      kept.push(child);
    }
  }
  return [[page, ...kept.flatMap(branch)], ...givenUp.flatMap((child) => cut(child, limit))];
}

/** How many moves all of `lines` begin with in common. */
function sharedStart(lines: Opening[]): number {
  const [first, ...rest] = lines;
  if (!first) return 0;
  return rest.reduce((shared, { san }) => {
    let plies = 0;
    while (plies < shared && san[plies] === first.san[plies]) plies++;
    return plies;
  }, first.san.length);
}

/**
 * Makes a group of the pages of a cut. A page says which opening its position belongs to, and
 * many pages say the same: those are a family, whose lines are told apart by the moves that
 * follow the ones they all share. Spellings of a name that differ only in capitals or
 * punctuation are one name.
 */
function groupOf(pages: Cut): GroupPlan[] {
  const [root] = pages;
  if (!root) return [];

  const byName = Map.groupBy(
    pages.map((page) => page.opening),
    (opening) => foldWords(opening.name).join(' '),
  );
  const families = [...byName.values()].map((lines): CatalogFamily => {
    const shared = sharedStart(lines);
    return {
      name: lines[0]?.name ?? '',
      lines: lines.map((opening) => ({
        opening,
        variation: formatMoveText(opening.san.slice(shared), shared),
      })),
    };
  });

  const { id, name, san } = root.opening;
  return [{ id, codes: '', title: name, moves: san, families }];
}

/** Lays the book's lines out by their moves, with no group bigger than `limit`. */
export function arrangeByMoves(openings: Opening[], limit = GROUP_LIMIT): SectionPlan[] {
  const ownSection = new Set<string>(SECTIONS.map((section) => section.id));
  const trees = Map.groupBy(growTrees(openings), ({ opening: { san } }) => {
    const [first = ''] = san;
    return ownSection.has(first) ? first : 'other';
  });

  return SECTIONS.map((section) => ({
    ...section,
    groups: (trees.get(section.id) ?? []).flatMap((tree) => cut(tree, limit)).flatMap(groupOf),
  }));
}

/**
 * Lays openings out the way the book does: first move → a page of the book and what follows
 * from it → the opening those positions belong to → line.
 */
export const WIKIBOOKS_ARRANGEMENT: Arrangement = {
  name: 'Wikibooks',
  title: 'Chess Opening Theory, a Wikibook',
  sectionsLabel: 'First moves',
  namesNest: false,
  arrange: (openings) => arrangeByMoves(openings),
  readMore: ({ page }) =>
    page === undefined
      ? undefined
      : {
          label: 'Read about this position in Chess Opening Theory, on Wikibooks',
          // By its id, the page is found even if it has since been renamed.
          href: `https://en.wikibooks.org/wiki/Special:Redirect/page/${page}`,
        },
};
