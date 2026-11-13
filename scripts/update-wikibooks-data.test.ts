import { describe, expect, it } from 'vitest';
import { updateWikibooksData } from './update-wikibooks-data.ts';

interface FakePage {
  pageid: number;
  title: string;
  /** Absent when the API has not got round to this page's text yet. */
  revision?: { revid: number; text: string };
}

const page = (pageid: number, path: string, revid?: number, text = ''): FakePage => ({
  pageid,
  title: `Chess Opening Theory/${path}`,
  ...(revid === undefined ? {} : { revision: { revid, text } }),
});

const named = (name: string) => `{{Chess Opening Theory/Position\n|${name}\n}}`;

/** The book as the API hands it over: in batches, each saying where the next begins. */
const BATCHES: FakePage[][] = [
  [
    page(300, '1. e4/1...e5', 9300, named('Open game')),
    page(100, '1. e4', 9100, named("King's Pawn opening")),
    page(500, 'Local manual of style', 9500, 'How to write a page.'),
    page(400, '1. e4/1...e5/2. Ke3', 9400, named('No such thing')),
    page(700, '1. e4/1...e5/2. Qh5/2...Ke7/3. Qxe5'),
  ],
  [
    page(700, '1. e4/1...e5/2. Qh5/2...Ke7/3. Qxe5', 9700, "'''Mate.'''"),
    page(600, '1. e4/1...e5/2. Qh5', 9600, '== 2. Qh5 · Wayward  queen attack =='),
  ],
];

function fakeWikibooks(batches = BATCHES) {
  const requested: URL[] = [];
  const written = new Map<string, string>();
  return {
    requested,
    written,
    io: {
      fetchJson: async (url: string) => {
        requested.push(new URL(url));
        const batch = requested.length - 1;
        return {
          ...(batch + 1 < batches.length
            ? { continue: { gapcontinue: `batch-${batch + 1}`, continue: 'gapcontinue||' } }
            : { batchcomplete: true }),
          query: {
            pages: (batches[batch] ?? []).map(({ pageid, title, revision }) => ({
              pageid,
              ns: 0,
              title,
              ...(revision && {
                revisions: [{ revid: revision.revid, slots: { main: { content: revision.text } } }],
              }),
            })),
          },
        };
      },
      writeFile: async (path: string, contents: string) => {
        written.set(path, contents);
      },
      today: () => '2026-11-13',
    },
  };
}

describe('updateWikibooksData', () => {
  it('asks the wiki for every page of the book, with its text, a batch at a time', async () => {
    const wiki = fakeWikibooks();

    await updateWikibooksData('data/wikibooks', wiki.io);

    expect(wiki.requested.map((url) => url.origin + url.pathname)).toEqual([
      'https://en.wikibooks.org/w/api.php',
      'https://en.wikibooks.org/w/api.php',
    ]);
    expect(Object.fromEntries(wiki.requested[0]?.searchParams ?? [])).toEqual({
      action: 'query',
      format: 'json',
      formatversion: '2',
      generator: 'allpages',
      gapprefix: 'Chess Opening Theory/',
      gapnamespace: '0',
      gapfilterredir: 'nonredirects',
      gaplimit: '50',
      prop: 'revisions',
      rvprop: 'ids|content',
      rvslots: 'main',
    });
    expect(wiki.requested[1]?.searchParams.get('gapcontinue')).toBe('batch-1');
    expect(wiki.requested[1]?.searchParams.get('continue')).toBe('gapcontinue||');
    expect(wiki.requested[1]?.searchParams.get('generator')).toBe('allpages');
  });

  it('writes a row for each page that is a line: its page, revision, name and moves', async () => {
    const wiki = fakeWikibooks();

    await updateWikibooksData('data/wikibooks', wiki.io);

    expect(wiki.written.get('data/wikibooks/pages.tsv')).toBe(
      [
        'page\trevision\tname\tpgn',
        "100\t9100\tKing's Pawn opening\t1. e4",
        '300\t9300\tOpen game\t1. e4 e5',
        '600\t9600\tWayward queen attack\t1. e4 e5 2. Qh5',
        '700\t9700\t\t1. e4 e5 2. Qh5 Ke7 3. Qxe5#',
        '',
      ].join('\n'),
    );
  });

  it('puts the rows in the order of a book, whatever order the wiki gives them in', async () => {
    const forwards = fakeWikibooks();
    const backwards = fakeWikibooks(BATCHES.toReversed().map((batch) => batch.toReversed()));

    await updateWikibooksData('data/wikibooks', forwards.io);
    await updateWikibooksData('data/wikibooks', backwards.io);

    expect(backwards.written.get('data/wikibooks/pages.tsv')).toBe(
      forwards.written.get('data/wikibooks/pages.tsv'),
    );
  });

  it('leaves out, and reports, the pages that are not lines or not legal games', async () => {
    const wiki = fakeWikibooks();

    const report = await updateWikibooksData('data/wikibooks', wiki.io);

    expect(report).toEqual({
      lines: 4,
      skipped: [
        { title: 'Chess Opening Theory/1. e4/1...e5/2. Ke3', reason: 'illegal move 3 (Ke3)' },
        { title: 'Chess Opening Theory/Local manual of style', reason: 'not a line' },
      ],
    });
  });

  it('records which book it read, when, and under what licence', async () => {
    const wiki = fakeWikibooks();

    await updateWikibooksData('data/wikibooks', wiki.io);

    expect(JSON.parse(wiki.written.get('data/wikibooks/SOURCE.json') ?? '')).toEqual({
      book: 'Chess Opening Theory',
      site: 'en.wikibooks.org',
      license: 'CC-BY-SA-4.0',
      retrieved: '2026-11-13',
    });
  });

  it('refuses to write anything when the wiki comes back with no lines at all', async () => {
    const wiki = fakeWikibooks([[page(500, 'Local manual of style', 9500, 'How to.')]]);

    await expect(updateWikibooksData('data/wikibooks', wiki.io)).rejects.toThrow(/no lines/);
    expect(wiki.written.size).toBe(0);
  });

  it('keeps the older of two pages that are the same line, and reports the other', async () => {
    const wiki = fakeWikibooks([
      [
        page(2, '1. e4/1...e5/2. Qh5/2...Ke7/3. Qxe5#', 12, named('Mate')),
        page(1, '1. e4/1...e5/2. Qh5/2...Ke7/3. Qxe5', 11, named('Not yet mate')),
      ],
    ]);

    const report = await updateWikibooksData('data/wikibooks', wiki.io);

    expect(wiki.written.get('data/wikibooks/pages.tsv')).toBe(
      'page\trevision\tname\tpgn\n1\t11\tNot yet mate\t1. e4 e5 2. Qh5 Ke7 3. Qxe5#\n',
    );
    expect(report.skipped).toEqual([
      {
        title: 'Chess Opening Theory/1. e4/1...e5/2. Qh5/2...Ke7/3. Qxe5#',
        reason: 'the same line as page 1',
      },
    ]);
  });
});
