import { describe, expect, it } from 'vitest';
import { monthInWords } from './month.ts';

describe('monthInWords', () => {
  it('says a month as it is said, whatever the time zone', () => {
    expect(monthInWords('2026-10')).toBe('October 2026');
    expect(monthInWords('2027-01')).toBe('January 2027');
  });
});
