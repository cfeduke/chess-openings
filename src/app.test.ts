// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mountApp } from './app.ts';

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
});
