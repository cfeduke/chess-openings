import { describe, expect, it } from 'vitest';
import { realOpenings } from '../../tests/support/real-openings.ts';
import type { Opening } from '../data/opening.ts';
import { ECO_ARRANGEMENT } from './arrangement.ts';

let nextId = 0;
const opening = (eco: string, name: string, san: string): Opening => ({
  id: `opening-${nextId++}`,
  eco,
  name,
  san: san.split(' '),
  uci: [],
});

const { arrange } = ECO_ARRANGEMENT;

describe('the encyclopaedia’s arrangement', () => {
  it('is called ECO, and its sections are the volumes', () => {
    expect(ECO_ARRANGEMENT).toMatchObject({
      name: 'ECO',
      title: 'Encyclopaedia of Chess Openings',
      sectionsLabel: 'ECO volumes',
    });
  });

  it('always lists the five volumes, even when some are empty', () => {
    const volumes = arrange([opening('B90', 'Sicilian Defense: Najdorf Variation', 'e4 c5')]);

    expect(
      volumes.map(({ id, tab, name, title, groups }) => [id, tab, name, title, groups.length]),
    ).toEqual([
      ['A', 'A', 'Volume A', 'Flank Openings', 0],
      ['B', 'B', 'Volume B', 'Semi-Open Games', 1],
      ['C', 'C', 'Volume C', 'Open Games & French Defense', 0],
      ['D', 'D', 'Volume D', 'Closed & Semi-Closed Games', 0],
      ['E', 'E', 'Volume E', 'Indian Defenses', 0],
    ]);
  });

  it('says what each volume covers', () => {
    for (const volume of arrange([])) expect(volume.summary.length).toBeGreaterThan(40);
  });

  it('files each opening under volume → ECO group → family → line', () => {
    const najdorf = opening('B90', 'Sicilian Defense: Najdorf Variation', 'e4 c5 Nf3 d6');
    const [, volumeB] = arrange([najdorf]);

    expect(volumeB?.groups).toEqual([
      {
        id: 'B90',
        codes: 'B90–B99',
        title: 'Sicilian Defense: Najdorf',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
        families: [
          {
            name: 'Sicilian Defense',
            lines: [
              { opening: najdorf, family: 'Sicilian Defense', variation: 'Najdorf Variation' },
            ],
          },
        ],
      },
    ]);
  });

  it('labels a group of one code with that code', () => {
    const [volumeA] = arrange([opening('A01', 'Nimzo-Larsen Attack', 'b3')]);

    expect(volumeA?.groups.map((group) => [group.id, group.codes])).toEqual([['A01', 'A01']]);
  });

  it('omits ECO groups that have no openings', () => {
    const [volumeA] = arrange([opening('A01', 'Nimzo-Larsen Attack', 'b3')]);

    expect(volumeA?.groups.map((group) => group.id)).toEqual(['A01']);
  });

  it('keeps one family together across the codes of a group, including its "with …" names', () => {
    const [volumeA] = arrange([
      opening('A07', "King's Indian Attack, with Bf5", 'Nf3 d5 g3 Bf5'),
      opening('A05', "King's Indian Attack", 'Nf3 Nf6 g3'),
      opening('A04', 'Zukertort Opening', 'Nf3'),
      opening('A08', "King's Indian Attack: French Variation", 'Nf3 d5 g3 c5 Bg2 Nc6'),
    ]);

    expect(volumeA?.groups[0]?.families).toEqual([
      {
        name: "King's Indian Attack",
        lines: [
          expect.objectContaining({ variation: '' }),
          expect.objectContaining({ variation: 'with Bf5' }),
          expect.objectContaining({ variation: 'French Variation' }),
        ],
      },
      { name: 'Zukertort Opening', lines: [expect.objectContaining({ variation: '' })] },
    ]);
  });

  it('leads each group with its biggest family, and breaks ties by ECO order', () => {
    const [volumeA] = arrange([
      opening('A04', 'Colle System: Rhamphorhynchus Variation', 'Nf3 g6'),
      opening('A04', 'Zukertort Opening', 'Nf3'),
      opening('A06', 'Zukertort Opening: Tennison Gambit', 'Nf3 d5 e4'),
      opening('A09', 'Réti Opening', 'Nf3 d5 c4'),
    ]);

    expect(volumeA?.groups[0]?.families.map((family) => family.name)).toEqual([
      'Zukertort Opening',
      'Colle System',
      'Réti Opening',
    ]);
  });

  it('orders lines by ECO code, then name, then length — whatever order they arrive in', () => {
    const [, , volumeC] = arrange([
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

  describe('of the real dataset', () => {
    const volumes = arrange(realOpenings);
    const groups = volumes.flatMap((volume) => volume.groups);

    it('never mixes volumes or groups up', () => {
      for (const volume of volumes) {
        for (const group of volume.groups) {
          const [from = '', to = from] = group.codes.split('–');
          for (const { opening: line } of group.families.flatMap((family) => family.lines)) {
            expect(line.eco[0]).toBe(volume.id);
            expect(line.eco >= from && line.eco <= to, `${line.eco} in ${group.codes}`).toBe(true);
          }
        }
      }
    });

    it('has the Sicilian as the only family of the Najdorf group', () => {
      const najdorf = groups.find((group) => group.id === 'B90');

      expect(najdorf?.families.map((family) => family.name)).toEqual(['Sicilian Defense']);
      expect(najdorf?.families[0]?.lines[0]?.variation).toBe('Najdorf Variation');
    });
  });
});
