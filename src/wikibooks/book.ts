/** The Wikibook the collection is taken from: what it is called, and where it is. */

/** The book's title. Its pages are the subpages of the page of that name. */
export const BOOK = 'Chess Opening Theory';

/** The wiki the book is on, by host name. */
export const SITE = 'en.wikibooks.org';

/**
 * The book has a page for a line if `pages` has its moves, joined by spaces. This is the page
 * for the longest line that `san` continues: the page it follows from, even where the book
 * skips a move or two on the way. With `orItself`, the page for `san` itself comes first; with
 * `wanted`, pages that will not do are passed over.
 */
export function pageAbove<Page>(
  pages: ReadonlyMap<string, Page>,
  san: string[],
  { orItself = false, wanted }: { orItself?: boolean; wanted?: (page: Page) => boolean } = {},
): Page | undefined {
  for (let plies = san.length - (orItself ? 0 : 1); plies > 0; plies--) {
    const page = pages.get(san.slice(0, plies).join(' '));
    if (page !== undefined && (!wanted || wanted(page))) return page;
  }
  return undefined;
}
