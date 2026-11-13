import { describe, expect, it } from 'vitest';
import { realOpenings } from '../../tests/support/real-openings.ts';
import type { Opening } from '../data/opening.ts';
import { buildCatalog } from './catalog.ts';

let nextId = 0;
const opening = (eco: string, name: string, san: string): Opening => ({
  id: `opening-${nextId++}`,
  eco,
  name,
  san: san.split(' '),
  uci: [],
});

describe('buildCatalog', () => {
  it('always lists the five volumes, even when some are empty', () => {
    const catalog = buildCatalog([opening('B90', 'Sicilian Defense: Najdorf Variation', 'e4 c5')]);

    expect(catalog.map((volume) => [volume.volume.letter, volume.count])).toEqual([
      ['A', 0],
      ['B', 1],
      ['C', 0],
      ['D', 0],
      ['E', 0],
    ]);
  });

  it('files each opening under volume → ECO group → family → line', () => {
    const najdorf = opening('B90', 'Sicilian Defense: Najdorf Variation', 'e4 c5 Nf3 d6');
    const [, volumeB] = buildCatalog([najdorf]);

    expect(volumeB?.groups).toEqual([
      {
        group: expect.objectContaining({
          from: 'B90',
          to: 'B99',
          title: 'Sicilian Defense: Najdorf',
        }),
        count: 1,
        families: [
          {
            name: 'Sicilian Defense',
            lines: [{ opening: najdorf, variation: 'Najdorf Variation' }],
          },
        ],
      },
    ]);
  });

  it('omits ECO groups that have no openings', () => {
    const [volumeA] = buildCatalog([opening('A01', 'Nimzo-Larsen Attack', 'b3')]);

    expect(volumeA?.groups.map((entry) => entry.group.from)).toEqual(['A01']);
  });

  it('keeps one family together across the codes of a group, including its "with …" names', () => {
    const [volumeA] = buildCatalog([
      opening('A07', "King's Indian Attack, with Bf5", 'Nf3 d5 g3 Bf5'),
      opening('A05', "King's Indian Attack", 'Nf3 Nf6 g3'),
      opening('A04', 'Zukertort Opening', 'Nf3'),
      opening('A08', "King's Indian Attack: French Variation", 'Nf3 d5 g3 c5 Bg2 Nc6'),
    ]);

    expect(volumeA?.groups[0]?.families).toEqual([
      { name: 'Zukertort Opening', lines: [expect.objectContaining({ variation: '' })] },
      {
        name: "King's Indian Attack",
        lines: [
          expect.objectContaining({ variation: '' }),
          expect.objectContaining({ variation: 'with Bf5' }),
          expect.objectContaining({ variation: 'French Variation' }),
        ],
      },
    ]);
  });

  it('orders lines by ECO code, then name, then length — whatever order they arrive in', () => {
    const [, , volumeC] = buildCatalog([
      opening('C51', 'Italian Game: Evans Gambit', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4'),
      opening('C50', 'Italian Game: Giuoco Pianissimo', 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6'),
      opening('C50', 'Italian Game', 'e4 e5 Nf3 Nc6 Bc4'),
      opening('C50', 'Italian Game: Giuoco Pianissimo', 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3'),
    ]);

    const lines = volumeC?.groups[0]?.families[0]?.lines ?? [];
    expect(
      lines.map((line) => [line.opening.eco, line.variation, line.opening.san.length]),
    ).toEqual([
      ['C50', '', 5],
      ['C50', 'Giuoco Pianissimo', 7],
      ['C50', 'Giuoco Pianissimo', 8],
      ['C51', 'Evans Gambit', 7],
    ]);
  });

  describe('for the real dataset', () => {
    const catalog = buildCatalog(realOpenings);
    const groups = catalog.flatMap((volume) => volume.groups);
    const lines = groups.flatMap((group) => group.families).flatMap((family) => family.lines);

    it('contains every opening exactly once', () => {
      expect(lines).toHaveLength(realOpenings.length);
      expect(new Set(lines.map((line) => line.opening)).size).toBe(realOpenings.length);
    });

    it('keeps the counts consistent at every level', () => {
      for (const volume of catalog) {
        expect(volume.count).toBe(volume.groups.reduce((sum, group) => sum + group.count, 0));
      }
      for (const group of groups) {
        expect(group.count).toBe(
          group.families.reduce((sum, family) => sum + family.lines.length, 0),
        );
      }
    });

    it('never mixes volumes or groups up', () => {
      for (const volume of catalog) {
        for (const { group, families } of volume.groups) {
          for (const { opening: line } of families.flatMap((family) => family.lines)) {
            expect(line.eco[0]).toBe(volume.volume.letter);
            expect(
              line.eco >= group.from && line.eco <= group.to,
              `${line.eco} in ${group.from}`,
            ).toBe(true);
          }
        }
      }
    });

    it('has the Sicilian as the only family of the Najdorf group', () => {
      const najdorf = groups.find((entry) => entry.group.from === 'B90');

      expect(najdorf?.families.map((family) => family.name)).toEqual(['Sicilian Defense']);
      expect(najdorf?.families[0]?.lines[0]?.variation).toBe('Najdorf Variation');
    });
  });
});
