import { describe, expect, it } from 'vitest';
import { STUDY, TWO_APPEARANCES } from '../../tests/support/appearances.ts';
import { APPEARANCES, appearanceById, DEFAULT_APPEARANCE } from './appearance.ts';
import { BOARD_COLORS, BOARD_THEMES } from './board-themes.ts';
import { PIECE_SETS } from './piece-sets.ts';

describe('the board themes', () => {
  it('begin with the brown board', () => {
    expect(BOARD_THEMES[0]).toMatchObject({
      id: 'brown',
      colors: { light: '#f0d9b5', dark: '#b58863' },
    });
  });

  it('each have an id of their own, and every colour a board needs', () => {
    const ids = BOARD_THEMES.map((theme) => theme.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const theme of BOARD_THEMES) {
      expect(Object.keys(theme.colors).sort()).toEqual([...BOARD_COLORS].sort());
    }
  });
});

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

  it('are made of declared piece sets and board themes', () => {
    for (const { pieces, board } of APPEARANCES) {
      expect(PIECE_SETS).toContain(pieces);
      expect(BOARD_THEMES).toContain(board);
    }
  });
});

describe('finding an appearance by its id', () => {
  it('finds the one that was asked for', () => {
    expect(appearanceById('study', TWO_APPEARANCES)).toBe(STUDY);
    expect(appearanceById('classic')).toBe(DEFAULT_APPEARANCE);
  });

  it('falls back to the first for an id nothing answers to', () => {
    expect(appearanceById('retired', TWO_APPEARANCES)).toBe(DEFAULT_APPEARANCE);
    expect(appearanceById('', TWO_APPEARANCES)).toBe(DEFAULT_APPEARANCE);
  });
});
