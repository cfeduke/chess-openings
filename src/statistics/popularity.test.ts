import { describe, expect, it } from 'vitest';
import { describeShare, POPULARITY_STEPS, popularityOf } from './popularity.ts';

describe('popularityOf', () => {
  it('is on a scale of five steps', () => {
    expect(POPULARITY_STEPS).toBe(5);
  });

  it.each([
    [0.58, 5],
    [0.1, 5],
    [0.092, 4],
    [0.01, 4],
    [0.0099, 3],
    [0.001, 3],
    [0.0001, 2],
    [0.00002, 1],
    [0.00001, 1],
    [0.000009, 0],
    [0, 0],
  ])('counts a step for each factor of ten: a share of %f is %i', (share, steps) => {
    expect(popularityOf(share)).toBe(steps);
  });
});

describe('describeShare', () => {
  it.each([
    [0.582, '58% of games'],
    [0.0921, '9.2% of games'],
    [0.0996, '10% of games'],
    [0.0354, '3.5% of games'],
    [0.00354, '0.35% of games'],
    [0.001, '0.1% of games'],
    [1, '100% of games'],
  ])('is a percentage to two figures where that says something: %f', (share, words) => {
    expect(describeShare(share)).toBe(words);
  });

  it.each([
    [0.00002, '1 game in 50,000'],
    [1 / 50_496, '1 game in 50,000'],
    [0.0009, '1 game in 1,100'],
    [1 / 94_074_706, '1 game in 94,000,000'],
  ])('is one game in so many where a percentage would be all noughts: %f', (share, words) => {
    expect(describeShare(share)).toBe(words);
  });

  it('says so when there were none', () => {
    expect(describeShare(0)).toBe('No games');
  });
});
