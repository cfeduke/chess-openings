import { describe, expect, it } from 'vitest';
import { arrowGeometry, squareCell } from './geometry.ts';

describe('squareCell', () => {
  it('puts a1 at the bottom left and h8 at the top right from White’s side', () => {
    expect(squareCell('a1', 'white')).toEqual({ column: 0, row: 7 });
    expect(squareCell('h8', 'white')).toEqual({ column: 7, row: 0 });
    expect(squareCell('e4', 'white')).toEqual({ column: 4, row: 4 });
  });

  it('turns the board around for Black', () => {
    expect(squareCell('a1', 'black')).toEqual({ column: 7, row: 0 });
    expect(squareCell('h8', 'black')).toEqual({ column: 0, row: 7 });
    expect(squareCell('e4', 'black')).toEqual({ column: 3, row: 3 });
  });
});

describe('arrowGeometry', () => {
  const length = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);

  it('points from the middle of one square to the middle of another', () => {
    const { shaft, head } = arrowGeometry('e2', 'e4', 'white');
    const [tip, left, right] = head;

    // e2 is centred on (4.5, 6.5) and e4 on (4.5, 4.5): straight up the e-file.
    expect(shaft.x1).toBeCloseTo(4.5);
    expect(shaft.x2).toBeCloseTo(4.5);
    expect(tip.x).toBeCloseTo(4.5);
    expect(tip.y).toBeCloseTo(4.5);
    expect(shaft.y1).toBeLessThan(6.5);
    expect(shaft.y1).toBeGreaterThan(shaft.y2);
    expect(shaft.y2).toBeGreaterThan(tip.y);
    // The head is a triangle, symmetric about the shaft, whose base is where the shaft ends.
    expect((left.x + right.x) / 2).toBeCloseTo(4.5);
    expect(left.y).toBeCloseTo(shaft.y2);
    expect(right.y).toBeCloseTo(shaft.y2);
    expect(left.x).not.toBeCloseTo(right.x);
  });

  it('follows the board when it is turned around', () => {
    const { shaft, head } = arrowGeometry('e2', 'e4', 'black');

    // From Black's side e2 is centred on (3.5, 1.5) and e4 on (3.5, 3.5): straight down.
    expect(shaft.x1).toBeCloseTo(3.5);
    expect(head[0].x).toBeCloseTo(3.5);
    expect(head[0].y).toBeCloseTo(3.5);
    expect(shaft.y1).toBeGreaterThan(1.5);
    expect(shaft.y2).toBeGreaterThan(shaft.y1);
  });

  it.each([
    ['a knight move', 'g1', 'f3'],
    ['a long diagonal', 'f1', 'b5'],
    ['a one-square step', 'e1', 'f1'],
    ['a rank-long slide', 'a1', 'h1'],
  ] as const)('keeps shaft and head in one straight line for %s', (_, from, to) => {
    const { shaft, head } = arrowGeometry(from, to, 'white');
    const [tip] = head;

    const whole = length(shaft.x1, shaft.y1, tip.x, tip.y);
    const parts =
      length(shaft.x1, shaft.y1, shaft.x2, shaft.y2) + length(shaft.x2, shaft.y2, tip.x, tip.y);
    expect(parts).toBeCloseTo(whole);
    expect(whole).toBeGreaterThan(0.5);
  });
});
