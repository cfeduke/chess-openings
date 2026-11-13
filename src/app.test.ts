// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp } from './app.ts';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
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

  it('lists the moves of the opening beside the board', () => {
    const root = document.createElement('div');

    mountApp(root);

    const moves = [...root.querySelectorAll('[aria-label="Moves"] .move')].map(
      (move) => move.textContent,
    );
    expect(moves).toEqual(['Start', 'e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
  });

  it('moves the cursor in the list as the pieces move', () => {
    const root = document.createElement('div');
    mountApp(root);

    vi.advanceTimersByTime(1500);

    expect(root.querySelector('[aria-current="step"]')?.textContent).toBe('e4');
  });

  it('has the player controls, with the delay at a second and a half', () => {
    const root = document.createElement('div');

    mountApp(root);

    expect(
      root.querySelector('[aria-label="Player controls"] button[aria-label="Pause"]'),
    ).not.toBeNull();
    expect(root.querySelector<HTMLInputElement>('input[type="range"]')?.value).toBe('1500');
  });

  it('plays at the delay the visitor chose last time', () => {
    localStorage.setItem('chess-openings.delayMs', '400');
    const root = document.createElement('div');
    mountApp(root);

    expect(root.querySelector<HTMLInputElement>('input[type="range"]')?.value).toBe('400');
    vi.advanceTimersByTime(400);
    expect(root.querySelector('[aria-current="step"]')?.textContent).toBe('e4');
  });

  it('ignores a saved delay that is out of range', () => {
    localStorage.setItem('chess-openings.delayMs', '5');
    const root = document.createElement('div');

    mountApp(root);

    expect(root.querySelector<HTMLInputElement>('input[type="range"]')?.value).toBe('300');
  });
});
