import { describe, expect, it } from 'vitest';
import { foldText } from './fold.ts';

describe('foldText', () => {
  it.each([
    ['Grünfeld Defense', 'grunfeld defense'],
    ['Réti Opening', 'reti opening'],
    ['Møller Defense', 'moller defense'],
    ['Čech–Matanović', 'cech–matanovic'],
  ])('folds %j to %j', (text, folded) => {
    expect(foldText(text)).toBe(folded);
  });

  it('keeps letters it cannot fold instead of failing, so it is safe on anything a user types', () => {
    expect(foldText('Łódź')).toBe('łodz');
  });
});
