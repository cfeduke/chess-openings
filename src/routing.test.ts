import { describe, expect, it } from 'vitest';
import { hashForOpening, openingIdFromHash } from './routing.ts';

describe('deep links', () => {
  it('put the opening’s id in the hash', () => {
    expect(hashForOpening('sicilian-defense-najdorf-variation')).toBe(
      '#/sicilian-defense-najdorf-variation',
    );
  });

  it('are read back from the hash', () => {
    expect(openingIdFromHash('#/sicilian-defense-najdorf-variation')).toBe(
      'sicilian-defense-najdorf-variation',
    );
    expect(openingIdFromHash(hashForOpening('zukertort-opening-7897c4'))).toBe(
      'zukertort-opening-7897c4',
    );
  });

  it.each(['', '#', '#/', '#about', '#/Not An Id', '#/a/b', '#/../etc'])(
    'find no opening in %j',
    (hash) => {
      expect(openingIdFromHash(hash)).toBeNull();
    },
  );
});
