// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { appearanceSetting } from './settings.ts';

afterEach(() => {
  localStorage.clear();
});

describe('the remembered appearance', () => {
  it('is none until the visitor has chosen one', () => {
    expect(appearanceSetting.read()).toBe('');
  });

  it('is the id of the one that was chosen', () => {
    appearanceSetting.write('study');

    expect(appearanceSetting.read()).toBe('study');
    expect(localStorage.getItem('chess-openings.appearance')).toBe('"study"');
  });

  it('is none when what was saved is not an id at all', () => {
    localStorage.setItem(appearanceSetting.key, '42');

    expect(appearanceSetting.read()).toBe('');
  });
});
