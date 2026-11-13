// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp } from './app.ts';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('mountApp', () => {
  it('renders the site heading into the root element', () => {
    const root = document.createElement('div');

    mountApp(root);

    expect(root.querySelector('h1')?.textContent).toBe('Chess Openings');
  });

  it('shows a board set up for a new game', () => {
    const root = document.createElement('div');

    mountApp(root);

    expect(root.querySelectorAll('.board .piece')).toHaveLength(32);
  });

  it('starts demonstrating an opening straight away', () => {
    const root = document.createElement('div');
    mountApp(root);

    vi.advanceTimersByTime(600);
    expect(root.querySelector('.square--highlight')?.getAttribute('data-square')).toBe('e2');

    vi.advanceTimersByTime(900);
    expect(root.querySelector('.piece[data-piece="e2"]')?.getAttribute('data-square')).toBe('e4');
  });
});
