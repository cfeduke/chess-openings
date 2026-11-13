import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STUDY, TWO_APPEARANCES } from '../../tests/support/appearances.ts';
import { APPEARANCES, appearanceById, DEFAULT_APPEARANCE } from './appearance.ts';

const PIECES_DIRECTORY = new URL('./pieces/', import.meta.url);
const PIECE_SETS = APPEARANCES.map((appearance) => appearance.pieces);

describe('the appearances', () => {
  it('begin with the default: the classic pieces on the brown board', () => {
    expect(APPEARANCES[0]).toBe(DEFAULT_APPEARANCE);
    expect(DEFAULT_APPEARANCE).toMatchObject({ id: 'classic', name: 'Classic' });
    expect(DEFAULT_APPEARANCE.pieces.id).toBe('cburnett');
    expect(DEFAULT_APPEARANCE.board.id).toBe('brown');
  });

  it('each have an id and a name of their own', () => {
    for (const label of ['id', 'name'] as const) {
      const labels = APPEARANCES.map((appearance) => appearance[label]);
      expect(new Set(labels).size, label).toBe(labels.length);
    }
  });

  it('say where the artwork of a theme pack comes from, by the name of the pack', () => {
    const pack = appearanceById('walnut-gold', APPEARANCES);

    expect(pack.name).toBe('Walnut & Gold');
    expect(pack.pieces.credit).toBe('from the Walnut & Gold set, in the public domain');
  });
});

describe('the piece sets of the appearances', () => {
  it('are the directories of pieces: none unused, none used and missing', () => {
    const directories = readdirSync(PIECES_DIRECTORY, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    expect(directories.sort()).toEqual(PIECE_SETS.map((set) => set.id).sort());
  });

  it.each(PIECE_SETS)('$id has an SVG for each of the twelve pieces', ({ artwork }) => {
    expect(Object.values(artwork)).toHaveLength(12);
    for (const image of Object.values(artwork)) expect(image).toContain('svg');
  });

  it('share no artwork, with one another or between two pieces', () => {
    const images = PIECE_SETS.flatMap((set) => Object.values(set.artwork));

    expect(new Set(images).size).toBe(images.length);
  });

  it.each(PIECE_SETS)('$id says under what licence its artwork is used', ({ id }) => {
    expect(existsSync(new URL(`${id}/LICENSE.md`, PIECES_DIRECTORY))).toBe(true);
  });
});

describe('finding an appearance by its id', () => {
  it('finds the one that was asked for', () => {
    expect(appearanceById('study', TWO_APPEARANCES)).toBe(STUDY);
  });

  it('falls back to the first for an id nothing answers to', () => {
    expect(appearanceById('retired', TWO_APPEARANCES)).toBe(DEFAULT_APPEARANCE);
    expect(appearanceById('', TWO_APPEARANCES)).toBe(DEFAULT_APPEARANCE);
  });
});
