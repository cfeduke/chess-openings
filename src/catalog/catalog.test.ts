import { describe, expect, it } from 'vitest';
import { encyclopaedia, LICHESS } from '../../tests/support/openings.ts';
import {
  BUDAPEST,
  DANISH,
  PAMPHLET,
  PAMPHLET_ARRANGEMENT,
  TWO_ARRANGEMENTS,
} from '../../tests/support/pamphlet.ts';
import { realDataset, realOpenings } from '../../tests/support/real-openings.ts';
import type { Opening } from '../data/opening.ts';
import { buildCatalog, lineLabel } from './catalog.ts';

let nextId = 0;
const opening = (eco: string, name: string, san: string): Opening => ({
  id: `opening-${nextId++}`,
  eco,
  name,
  san: san.split(' '),
  uci: [],
});

const najdorf = opening('B90', 'Sicilian Defense: Najdorf Variation', 'e4 c5 Nf3 d6');
const english = opening(
  'B90',
  'Sicilian Defense: Najdorf Variation, English Attack',
  'e4 c5 Nf3 d6 Be3',
);
const italian = opening('C50', 'Italian Game', 'e4 e5');

describe('buildCatalog', () => {
  const catalog = buildCatalog(
    [encyclopaedia([english, najdorf, italian]), PAMPHLET],
    TWO_ARRANGEMENTS,
  );
  const [eco, pamphlet] = catalog.collections;

  it('lists the collections in the order they are given, each as its arrangement presents it', () => {
    expect(
      catalog.collections.map(({ id, name, title, sectionsLabel }) => [
        id,
        name,
        title,
        sectionsLabel,
      ]),
    ).toEqual([
      ['eco', 'ECO', 'Encyclopaedia of Chess Openings', 'ECO volumes'],
      ['pamphlet', 'Pamphlet', 'A Pamphlet of Gambits', 'Pamphlet chapters'],
    ]);
  });

  it('keeps each collection’s source, to be credited', () => {
    expect(eco?.source).toBe(LICHESS);
    expect(pamphlet?.source).toBe(PAMPHLET.source);
  });

  it('lays each collection out in the sections and groups its arrangement gives it', () => {
    expect(eco?.sections.map((section) => section.tab)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(pamphlet?.sections).toEqual(
      PAMPHLET_ARRANGEMENT.arrange(PAMPHLET.openings).map((section) =>
        expect.objectContaining({
          ...section,
          groups: section.groups.map((group) => expect.objectContaining(group)),
        }),
      ),
    );
  });

  it('counts the lines of every group, section and collection', () => {
    expect(eco?.count).toBe(3);
    expect(eco?.sections.map((section) => section.count)).toEqual([0, 2, 1, 0, 0]);
    expect(eco?.sections[1]?.groups.map((group) => group.count)).toEqual([2]);
    expect(pamphlet?.count).toBe(4);
    expect(pamphlet?.sections.map((section) => section.count)).toEqual([3, 1, 0]);
  });

  it('uses the site’s own arrangements unless it is given others', () => {
    const [collection] = buildCatalog([encyclopaedia([italian])]).collections;

    expect(collection?.name).toBe('ECO');
  });

  it('refuses a collection it has no arrangement for', () => {
    expect(() => buildCatalog([PAMPHLET])).toThrow('no arrangement for the collection "pamphlet"');
  });

  describe('locate', () => {
    it('says where an opening is filed, down to its place among the lines of its family', () => {
      const place = catalog.locate(english.id);

      expect(place?.opening).toBe(english);
      expect(place?.collection).toBe(eco);
      expect(place?.section.tab).toBe('B');
      expect(place?.group.id).toBe('B90');
      expect(place?.family.name).toBe('Sicilian Defense');
      expect(place?.family.lines[place.index]?.opening).toBe(english);
      expect(place?.index).toBe(1);
      expect(catalog.locate(najdorf.id)?.index).toBe(0);
    });

    it('finds the openings of every collection', () => {
      const place = catalog.locate(BUDAPEST.id);

      expect(place?.collection).toBe(pamphlet);
      expect(place?.section.tab).toBe('1. d4');
      expect(place?.group.title).toBe('Gambits after 1. d4');
      expect(catalog.locate(DANISH.id)?.section.tab).toBe('1. e4');
    });

    it('finds nothing for an id it does not know', () => {
      expect(catalog.locate('no-such-opening')).toBeUndefined();
    });
  });

  describe('for the real dataset', () => {
    const real = buildCatalog(realDataset.collections);
    const everyOpening = realDataset.collections.flatMap((collection) => collection.openings);
    const sections = real.collections.flatMap((collection) => collection.sections);
    const groups = sections.flatMap((section) => section.groups);
    const lines = groups.flatMap((group) => group.families).flatMap((family) => family.lines);

    it('contains every opening exactly once', () => {
      expect(lines).toHaveLength(everyOpening.length);
      expect(new Set(lines.map((line) => line.opening)).size).toBe(everyOpening.length);
    });

    it('keeps the counts consistent at every level', () => {
      const sum = (counts: number[]) => counts.reduce((total, count) => total + count, 0);

      for (const collection of real.collections) {
        expect(collection.count).toBe(sum(collection.sections.map((section) => section.count)));
      }
      for (const section of sections) {
        expect(section.count).toBe(sum(section.groups.map((group) => group.count)));
      }
      for (const group of groups) {
        expect(group.count).toBe(sum(group.families.map((family) => family.lines.length)));
      }
    });

    it('gives every group an id of its own', () => {
      expect(new Set(groups.map((group) => group.id)).size).toBe(groups.length);
    });

    it('finds every opening', () => {
      expect(everyOpening.filter((entry) => real.locate(entry.id)?.opening !== entry)).toEqual([]);
    });

    it('has the encyclopaedia first, holding the lichess lines', () => {
      expect(real.collections[0]?.id).toBe('eco');
      expect(real.collections[0]?.count).toBe(realOpenings.length);
    });
  });
});

describe('lineLabel', () => {
  it('is what distinguishes a line within its family, or "Main line" for the family’s own', () => {
    expect(lineLabel({ family: 'Italian Game', variation: 'Giuoco Pianissimo' })).toBe(
      'Giuoco Pianissimo',
    );
    expect(lineLabel({ family: 'Italian Game', variation: '' })).toBe('Main line');
  });
});
