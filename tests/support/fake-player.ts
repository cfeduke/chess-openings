import { vi } from 'vitest';
import type { Player, PlayerSnapshot } from '../../src/playback/player.ts';

/** A player that does nothing but record what it is asked, and report whatever `emit` says. */
export function fakePlayer(initial: Partial<PlayerSnapshot> = {}) {
  let snapshot: PlayerSnapshot = {
    playing: false,
    moves: [],
    ply: 0,
    pending: null,
    delayMs: 1500,
    ...initial,
  };
  const listeners = new Set<(snapshot: PlayerSnapshot) => void>();

  const player = {
    get snapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
    stepForward: vi.fn(),
    stepBack: vi.fn(),
    seek: vi.fn(),
    restart: vi.fn(),
    setDelay: vi.fn(),
  } satisfies Player;

  /** Changes the snapshot and tells the subscribers, as the real player would. */
  const emit = (change: Partial<PlayerSnapshot>) => {
    snapshot = { ...snapshot, ...change };
    for (const listener of listeners) listener(snapshot);
  };

  return { player, emit };
}
