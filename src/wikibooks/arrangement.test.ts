import { describe, expect, it } from 'vitest';
import { realWikibooks } from '../../tests/support/real-openings.ts';
import type { GroupPlan } from '../catalog/catalog.ts';
import { formatMoveText } from '../chess/san.ts';
import type { Opening } from '../data/opening.ts';
import { arrangeByMoves, GROUP_LIMIT, WIKIBOOKS_ARRANGEMENT } from './arrangement.ts';

let nextPage = 1;
/** A page of the book. Its moves need not be playable: the arrangement only reads them. */
const page = (moves: string, name: string): Opening => {
  const number = nextPage++;
  return {
    id: `wikibooks-${number}`,
    eco: 'A00',
    name,
    san: moves.split(' '),
    uci: [],
    page: number,
  };
};

const linesOf = (group: GroupPlan | undefined) =>
  (group?.families ?? []).flatMap((family) =>
    family.lines.map((line) => formatMoveText(line.opening.san)),
  );
const rootsOf = (groups: GroupPlan[] | undefined) =>
  (groups ?? []).map((group) => formatMoveText(group.moves));

describe('the Wikibook’s arrangement', () => {
  it('is called Wikibooks, and its sections are first moves', () => {
    expect(WIKIBOOKS_ARRANGEMENT).toMatchObject({
      name: 'Wikibooks',
      title: 'Chess Opening Theory, a Wikibook',
      sectionsLabel: 'First moves',
    });
  });

  it('has a section for 1. e4, one for 1. d4 and one for every other first move', () => {
    const sections = arrangeByMoves([]);

    expect(sections.map(({ id, tab, name, title }) => [id, tab, name, title])).toEqual([
      ['e4', '1. e4', '1. e4', 'King’s Pawn Openings'],
      ['d4', '1. d4', '1. d4', 'Queen’s Pawn Openings'],
      ['other', 'Other', 'Other first moves', 'Flank & Irregular Openings'],
    ]);
    for (const section of sections) {
      expect(section.summary.length).toBeGreaterThan(40);
      expect(section.groups).toEqual([]);
    }
  });

  it('files each line by its first move', () => {
    const [e4, d4, other] = arrangeByMoves([
      page('d4', 'Queen’s Pawn'),
      page('e4 c5', 'Sicilian'),
      page('c4', 'English'),
      page('e4', 'King’s Pawn'),
      page('Nf3 d5', 'Réti'),
      page('Nf3', 'Zukertort'),
    ]);

    expect(linesOf(e4?.groups[0])).toEqual(['1. e4', '1. e4 c5']);
    expect(linesOf(d4?.groups[0])).toEqual(['1. d4']);
    expect(rootsOf(other?.groups)).toEqual(['1. Nf3', '1. c4']);
  });

  describe('a group', () => {
    const king = page('e4', 'King’s Pawn');
    const [section] = arrangeByMoves([king, page('e4 e5', 'Open Game')]);
    const [group] = section?.groups ?? [];

    it('is a page and everything under it, named after the page', () => {
      expect(group).toMatchObject({ id: king.id, codes: '', title: 'King’s Pawn', moves: ['e4'] });
      expect(linesOf(group)).toEqual(['1. e4', '1. e4 e5']);
    });

    it('is not split while it is small enough to read', () => {
      expect(section?.groups).toHaveLength(1);
    });
  });

  describe('a part of the book too big for one group', () => {
    // 1. e4 has three replies: 1… e5 with five lines under it, 1… c5 with two, 1… e6 alone.
    const book = [
      page('e4', 'King’s Pawn'),
      page('e4 e6', 'French'),
      page('e4 c5', 'Sicilian'),
      page('e4 c5 Nf3', 'Sicilian'),
      page('e4 c5 Nf3 d6', 'Sicilian'),
      page('e4 e5', 'Open Game'),
      page('e4 e5 Nf3', 'King’s Knight'),
      page('e4 e5 Nf3 Nc6', 'King’s Knight'),
      page('e4 e5 Nf3 Nc6 Bb5', 'Ruy López'),
      page('e4 e5 Nf3 Nc6 Bc4', 'Italian'),
      page('e4 e5 f4', 'King’s Gambit'),
    ];

    it('gives up its biggest branches, one at a time, until what is left fits', () => {
      const [section] = arrangeByMoves(book, 6);

      expect(rootsOf(section?.groups)).toEqual(['1. e4', '1. e4 e5']);
      expect(linesOf(section?.groups[0])).toEqual([
        '1. e4',
        '1. e4 c5',
        '1. e4 c5 2. Nf3',
        '1. e4 c5 2. Nf3 d6',
        '1. e4 e6',
      ]);
      expect(linesOf(section?.groups[1])).toHaveLength(6);
    });

    it('splits a branch that is itself too big, and lists the groups in reading order', () => {
      const [section] = arrangeByMoves(book, 3);

      expect(rootsOf(section?.groups)).toEqual([
        '1. e4',
        '1. e4 e5',
        '1. e4 e5 2. Nf3',
        '1. e4 e5 2. Nf3 Nc6',
        '1. e4 c5',
      ]);
      expect(section?.groups.map((group) => linesOf(group).length)).toEqual([2, 2, 1, 3, 3]);
      expect(section?.groups.map((group) => group.title)).toEqual([
        'King’s Pawn',
        'Open Game',
        'King’s Knight',
        'King’s Knight',
        'Sicilian',
      ]);
    });

    it('never leaves a line out, or files one twice', () => {
      for (const limit of [1, 2, 3, 6, 100]) {
        const lines = arrangeByMoves(book, limit).flatMap((section) =>
          section.groups.flatMap(linesOf),
        );

        expect(lines.toSorted(), `limit ${limit}`).toEqual(
          book.map((line) => formatMoveText(line.san)).toSorted(),
        );
      }
    });

    it('lists the lines of a group as a book would: a page, then what follows from it', () => {
      const [section] = arrangeByMoves(book, 100);

      expect(linesOf(section?.groups[0])).toEqual([
        '1. e4',
        '1. e4 e5',
        '1. e4 e5 2. Nf3',
        '1. e4 e5 2. Nf3 Nc6',
        '1. e4 e5 2. Nf3 Nc6 3. Bb5',
        '1. e4 e5 2. Nf3 Nc6 3. Bc4',
        '1. e4 e5 2. f4',
        '1. e4 c5',
        '1. e4 c5 2. Nf3',
        '1. e4 c5 2. Nf3 d6',
        '1. e4 e6',
      ]);
    });
  });

  describe('the families of a group', () => {
    const [section] = arrangeByMoves([
      page('d4', 'Queen’s Pawn opening'),
      page('d4 d5', 'Closed game'),
      page('d4 d5 c4', 'Queen’s Gambit'),
      page('d4 d5 c4 e6', 'Queen’s gambit'),
      page('d4 d5 c4 e6 Nc3', 'Queen’s Gambit'),
      page('d4 d5 c4 c6', 'Slav Defence'),
      page('d4 d5 Bf4', 'Closed Game'),
      page('d4 Nf6', 'Indian defence'),
    ]);
    const families = section?.groups[0]?.families ?? [];

    it('are the opening names, however they are capitalised, in the order they come up', () => {
      expect(families.map((family) => [family.name, family.lines.length])).toEqual([
        ['Queen’s Pawn opening', 1],
        ['Closed game', 2],
        ['Queen’s Gambit', 3],
        ['Slav Defence', 1],
        ['Indian defence', 1],
      ]);
    });

    it('tell their lines apart by the moves that follow the ones they share', () => {
      const variations = Object.fromEntries(
        families.map((family) => [family.name, family.lines.map((line) => line.variation)]),
      );

      expect(variations).toEqual({
        'Queen’s Pawn opening': [''],
        'Closed game': ['', '2. Bf4'],
        'Queen’s Gambit': ['', '2… e6', '2… e6 3. Nc3'],
        'Slav Defence': [''],
        'Indian defence': [''],
      });
    });

    it('number the moves from wherever the lines part, when no line is the start of them all', () => {
      const [gambits] = arrangeByMoves([
        page('e4', 'King’s Pawn'),
        page('e4 e5 f4', 'Gambit'),
        page('e4 e5 d4', 'Gambit'),
      ]);

      expect(gambits?.groups[0]?.families[1]?.lines.map((line) => line.variation)).toEqual([
        '2. d4',
        '2. f4',
      ]);
    });
  });

  it('hangs a page whose own parent is missing from the nearest page above it', () => {
    const [section] = arrangeByMoves(
      [
        page('e4', 'King’s Pawn'),
        page('e4 e5 Nf3 Nc6', 'King’s Knight'),
        page('e4 c5', 'Sicilian'),
        page('e4 e5', 'Open Game'),
        page('e4 e5 Nf3 Nc6 Bc4', 'Italian'),
      ],
      3,
    );

    expect(rootsOf(section?.groups)).toEqual(['1. e4', '1. e4 e5']);
    expect(linesOf(section?.groups[1])).toEqual([
      '1. e4 e5',
      '1. e4 e5 2. Nf3 Nc6',
      '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    ]);
  });

  it('starts a group at a page that has nothing above it at all', () => {
    const [section] = arrangeByMoves([page('e4 e5', 'Open Game'), page('e4 c5', 'Sicilian')]);

    expect(rootsOf(section?.groups)).toEqual(['1. e4 c5', '1. e4 e5']);
  });

  describe('readMore', () => {
    it('leads to the page of the book that a line is from', () => {
      const line = { ...page('e4', 'King’s Pawn'), page: 36277 };

      expect(WIKIBOOKS_ARRANGEMENT.readMore?.(line)).toEqual({
        label: 'Read about this position in Chess Opening Theory, on Wikibooks',
        href: 'https://en.wikibooks.org/wiki/Special:Redirect/page/36277',
      });
    });

    it('leads nowhere for a line that is from no page', () => {
      const { page: _, ...line } = page('e4', 'King’s Pawn');

      expect(WIKIBOOKS_ARRANGEMENT.readMore?.(line)).toBeUndefined();
    });
  });

  describe('of the real book', () => {
    const sections = WIKIBOOKS_ARRANGEMENT.arrange(realWikibooks);
    const groups = sections.flatMap((section) => section.groups);

    it('has something in every section', () => {
      expect(sections.filter((section) => section.groups.length === 0)).toEqual([]);
    });

    it('opens each of the first two sections with the first move itself', () => {
      expect(sections.slice(0, 2).map((section) => rootsOf(section.groups)[0])).toEqual([
        '1. e4',
        '1. d4',
      ]);
    });

    it('keeps every group small enough to read', () => {
      expect(GROUP_LIMIT).toBe(120);
      expect(groups.filter((group) => linesOf(group).length > GROUP_LIMIT)).toEqual([]);
    });

    it('files under each first move only the lines that begin with it', () => {
      const [e4, d4, other] = sections.map((section) =>
        section.groups.flatMap((group) => group.families).flatMap((family) => family.lines),
      );

      expect(e4?.every((line) => line.opening.san[0] === 'e4')).toBe(true);
      expect(d4?.every((line) => line.opening.san[0] === 'd4')).toBe(true);
      expect(other?.some((line) => ['e4', 'd4'].includes(line.opening.san[0] ?? ''))).toBe(false);
    });

    it('has the Ruy López as a group of its own, where the book has it', () => {
      const ruy = groups.find(
        (group) => formatMoveText(group.moves) === '1. e4 e5 2. Nf3 Nc6 3. Bb5',
      );

      expect(ruy?.title).toBe('Ruy López / Spanish game');
      expect(ruy?.families[0]?.lines[0]?.variation).toBe('');
    });

    it('gives no two lines of a family the same label', () => {
      for (const family of groups.flatMap((group) => group.families)) {
        const labels = family.lines.map((line) => line.variation);

        expect(new Set(labels).size, family.name).toBe(labels.length);
      }
    });
  });
});
