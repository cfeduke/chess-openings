import { describe, expect, it } from 'vitest';
import { STUDY, TWO_APPEARANCES } from '../../tests/support/appearances.ts';
import { APPEARANCES, appearanceById, DEFAULT_APPEARANCE } from './appearance.ts';
import { BOARD_THEMES } from './board-themes.ts';
import { PIECE_SETS } from './piece-sets.ts';

describe('the appearances', () => {
  it('begin with the default: the classic pieces on the brown board', () => {
    expect(APPEARANCES[0]).toBe(DEFAULT_APPEARANCE);
    expect(DEFAULT_APPEARANCE).toMatchObject({ id: 'classic', name: 'Classic' });
    expect(DEFAULT_APPEARANCE.pieces.id).toBe('cburnett');
    expect(DEFAULT_APPEARANCE.board.id).toBe('brown');
  });

  it('are Classic and then the four theme packs, each named after its two words', () => {
    expect(APPEARANCES.map(({ id, name }) => [id, name])).toEqual([
      ['classic', 'Classic'],
      ['walnut-gold', 'Walnut & Gold'],
      ['midnight-cyan', 'Midnight & Cyan'],
      ['sage-sand', 'Sage & Sand'],
      ['slate-ivory', 'Slate & Ivory'],
    ]);
  });

  it('put each theme pack’s pieces on its own board', () => {
    for (const { id, pieces, board } of APPEARANCES.slice(1)) {
      expect(pieces.id, id).toBe(id);
      expect(board.id, id).toBe(id);
    }
  });

  it('each have an id and a name of their own', () => {
    for (const label of ['id', 'name'] as const) {
      const labels = APPEARANCES.map((appearance) => appearance[label]);
      expect(new Set(labels).size, label).toBe(labels.length);
    }
  });

  it('are made of listed piece sets and board themes, which have ids of their own too', () => {
    for (const { pieces, board } of APPEARANCES) {
      expect(PIECE_SETS).toContain(pieces);
      expect(BOARD_THEMES).toContain(board);
    }
    for (const listed of [PIECE_SETS, BOARD_THEMES]) {
      expect(new Set(listed.map(({ id }) => id)).size).toBe(listed.length);
    }
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
