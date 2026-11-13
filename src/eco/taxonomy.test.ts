import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { realOpenings } from '../../tests/support/real-openings.ts';
import { formatMoveText } from '../chess/san.ts';
import { ECO_VOLUMES, ecoGroupOf, ecoRangeLabel } from './taxonomy.ts';

const ALL_CODES = [...'ABCDE'].flatMap((letter) =>
  Array.from({ length: 100 }, (_, n) => `${letter}${String(n).padStart(2, '0')}`),
);
const ALL_GROUPS = ECO_VOLUMES.flatMap((volume) => volume.groups);
const number = (eco: string) => Number(eco.slice(1));

describe('ECO volumes', () => {
  it('are the five volumes of the encyclopaedia, in order', () => {
    expect(ECO_VOLUMES.map((volume) => [volume.letter, volume.title])).toEqual([
      ['A', 'Flank Openings'],
      ['B', 'Semi-Open Games'],
      ['C', 'Open Games & French Defense'],
      ['D', 'Closed & Semi-Closed Games'],
      ['E', 'Indian Defenses'],
    ]);
  });

  it('each explain what they cover', () => {
    for (const volume of ECO_VOLUMES) expect(volume.summary.length).toBeGreaterThan(40);
  });
});

describe('ECO groups', () => {
  it.each(ECO_VOLUMES)(
    'tile volume $letter from 00 to 99 without gaps or overlaps',
    ({ letter, groups }) => {
      expect(groups[0]?.from).toBe(`${letter}00`);
      expect(groups.at(-1)?.to).toBe(`${letter}99`);
      for (const [index, group] of groups.entries()) {
        expect(group.from[0]).toBe(letter);
        expect(group.to[0]).toBe(letter);
        expect(number(group.to)).toBeGreaterThanOrEqual(number(group.from));
        const next = groups[index + 1];
        if (next) expect(number(next.from)).toBe(number(group.to) + 1);
      }
    },
  );

  it('have unique titles', () => {
    const titles = ALL_GROUPS.map((group) => group.title);

    expect(new Set(titles).size).toBe(titles.length);
  });

  it('place every code A00–E99 in exactly one group', () => {
    for (const eco of ALL_CODES) {
      const containing = ALL_GROUPS.filter((group) => group.from <= eco && eco <= group.to);

      expect(containing, eco).toEqual([ecoGroupOf(eco)]);
    }
  });

  it.each([
    ['A00', 'Irregular First Moves'],
    ['B90', 'Sicilian Defense: Najdorf'],
    ['B99', 'Sicilian Defense: Najdorf'],
    ['C50', 'Italian Game: Giuoco Piano & Evans Gambit'],
    ['C65', 'Ruy Lopez: Berlin Defense'],
    ['D43', 'Semi-Slav Defense'],
    ['E97', "King's Indian Defense: Classical"],
  ])('file %s under %j', (eco, title) => {
    expect(ecoGroupOf(eco).title).toBe(title);
  });

  it.each(['F00', 'A0', 'A100', 'b90', ''])('reject %j as an ECO code', (eco) => {
    expect(() => ecoGroupOf(eco)).toThrow(/not an ECO code/);
  });

  it('label a range of codes, or a single code', () => {
    expect(ecoRangeLabel(ecoGroupOf('B95'))).toBe('B90–B99');
    expect(ecoRangeLabel(ecoGroupOf('A00'))).toBe('A00');
  });
});

describe('defining moves', () => {
  it('exist for every group except the irregular first moves', () => {
    const without = ALL_GROUPS.filter((group) => group.moves.length === 0);

    expect(without.map((group) => group.from)).toEqual(['A00']);
  });

  it('are move lists, like the lines they describe', () => {
    expect(ecoGroupOf('C65').moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6']);
    expect(formatMoveText(ecoGroupOf('B90').moves)).toBe(
      '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6',
    );
  });

  it.each(ALL_GROUPS.map((group) => ({ ...group, line: formatMoveText(group.moves) })))(
    'of $from ($title) are a legal line: $line',
    ({ moves }) => {
      const game = new Chess();

      for (const san of moves) game.move(san, { strict: true });
    },
  );
});

// The table is hand-curated, so check it against the lines lichess actually files under each
// range. Move order varies between transpositions; what defines a group is that each side has
// played its defining moves.
describe('the real dataset', () => {
  const byGroup = Map.groupBy(realOpenings, (opening) => ecoGroupOf(opening.eco));
  const sideMoves = (san: string[], side: 0 | 1) => san.filter((_, ply) => ply % 2 === side);
  const playsAll = (line: string[], defining: string[]) =>
    ([0, 1] as const).every((side) =>
      sideMoves(defining, side).every((move) => sideMoves(line, side).includes(move)),
    );

  it('has openings in every group', () => {
    const empty = ALL_GROUPS.filter((group) => !byGroup.has(group));

    expect(empty.map((group) => group.from)).toEqual([]);
  });

  it.each(ALL_GROUPS)(
    'has the defining moves of $from ($title) in at least 90% of its lines',
    (group) => {
      const lines = byGroup.get(group) ?? [];

      const matching = lines.filter((opening) => playsAll(opening.san, group.moves));

      expect(matching.length / lines.length).toBeGreaterThanOrEqual(0.9);
    },
  );
});
