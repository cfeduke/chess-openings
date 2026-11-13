import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXCHANGE_SPANISH, ITALIAN_GAME } from '../../tests/support/lines.ts';
import { buildTimeline, type Timeline } from '../chess/timeline.ts';
import { createPlayer, type PlayerBoard, type SoundCue } from './player.ts';

const italian = buildTimeline(ITALIAN_GAME);
const eventful = buildTimeline(EXCHANGE_SPANISH);

/** A board that writes down what it is asked to do, in order. */
function setup(timeline: Timeline = italian) {
  const log: string[] = [];
  const cues: SoundCue[] = [];
  const board: PlayerBoard = {
    setPosition(position, { lastMove, durationMs = 0 } = {}) {
      const after = timeline.positions.indexOf(position);
      const last = lastMove ? `${lastMove.from}${lastMove.to}` : 'none';
      log.push(`position after ${after} moves (last ${last}, ${durationMs}ms)`);
    },
    highlight: (square) => log.push(`highlight ${square}`),
    showArrow: (from, to, { durationMs = 0 } = {}) =>
      log.push(`arrow ${from}${to} (${durationMs}ms)`),
    clearAnnotations: () => log.push('clear annotations'),
  };
  const player = createPlayer({ board, sound: (cue) => cues.push(cue) });
  player.load(timeline);
  /** What has happened since this was last called. */
  const happened = () => log.splice(0);
  happened();
  return { player, board, happened, cues };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('loading a line', () => {
  it('shows the starting position and waits to be played', () => {
    const { player, happened } = setup();

    player.load(italian);

    expect(happened()).toEqual(['position after 0 moves (last none, 0ms)']);
    expect(player.snapshot).toEqual({
      playing: false,
      moves: italian.moves,
      ply: 0,
      pending: null,
      delayMs: 1500,
    });
    vi.advanceTimersByTime(10_000);
    expect(happened()).toEqual([]);
  });

  it('stops whatever line was playing', () => {
    const { player, happened } = setup();
    player.play();
    vi.advanceTimersByTime(700);
    happened();

    player.load(eventful);

    expect(player.snapshot).toMatchObject({
      playing: false,
      moves: eventful.moves,
      ply: 0,
      pending: null,
    });
    vi.advanceTimersByTime(10_000);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('playing', () => {
  it('demonstrates a move in three beats: highlight the piece, draw the arrow, move the piece', () => {
    const { player, happened } = setup();

    player.play();
    expect(player.snapshot).toMatchObject({ playing: true, ply: 0, pending: null });

    vi.advanceTimersByTime(599);
    expect(happened()).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(happened()).toEqual(['highlight e2']);
    expect(player.snapshot).toMatchObject({ ply: 0, pending: 0 });

    vi.advanceTimersByTime(374);
    expect(happened()).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(happened()).toEqual(['arrow e2e4 (375ms)']);
    expect(player.snapshot).toMatchObject({ ply: 0, pending: 0 });

    vi.advanceTimersByTime(524);
    expect(happened()).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(happened()).toEqual(['position after 1 moves (last e2e4, 375ms)']);
    expect(player.snapshot).toMatchObject({ playing: true, ply: 1, pending: null });
  });

  it('makes one move per delay', () => {
    const { player, happened } = setup();

    player.play();
    vi.advanceTimersByTime(3 * 1500);

    expect(player.snapshot).toMatchObject({ playing: true, ply: 3 });
    expect(happened().filter((event) => event.startsWith('position'))).toEqual([
      'position after 1 moves (last e2e4, 375ms)',
      'position after 2 moves (last e7e5, 375ms)',
      'position after 3 moves (last g1f3, 375ms)',
    ]);
  });

  it('stops by itself once the last piece has landed', () => {
    const { player, happened } = setup();

    player.play();
    vi.advanceTimersByTime(5 * 1500);
    expect(player.snapshot).toMatchObject({ playing: true, ply: 5, pending: null });

    vi.advanceTimersByTime(375);
    expect(player.snapshot).toMatchObject({ playing: false, ply: 5, pending: null });

    happened();
    vi.advanceTimersByTime(10_000);
    expect(happened()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('starts over when played again from the end', () => {
    const { player, happened } = setup();
    player.play();
    vi.advanceTimersByTime(5 * 1500 + 1000);
    happened();

    player.play();

    expect(happened()).toEqual(['position after 0 moves (last none, 0ms)']);
    expect(player.snapshot).toMatchObject({ playing: true, ply: 0 });
    vi.advanceTimersByTime(600);
    expect(happened()).toEqual(['highlight e2']);
  });

  it('does nothing when it is already playing, or when there is nothing to play', () => {
    const { player, happened } = setup();
    player.play();
    vi.advanceTimersByTime(300);

    player.play();
    vi.advanceTimersByTime(300);
    expect(happened()).toEqual(['highlight e2']);

    const empty = setup(buildTimeline({ san: [], uci: [] }));
    empty.player.play();
    expect(empty.player.snapshot.playing).toBe(false);
  });
});

describe('sound', () => {
  it('names what each move sounds like', () => {
    const { player, cues } = setup(eventful);

    player.play();
    vi.advanceTimersByTime(15 * 1500);

    expect(cues).toEqual([
      'move', // e4
      'move', // e5
      'move', // Nf3
      'move', // Nc6
      'move', // Bb5
      'move', // a6
      'capture', // Bxc6
      'capture', // dxc6
      'castle', // O-O
      'move', // Bg4
      'move', // h3
      'capture', // Bxf3
      'capture', // Qxf3
      'move', // Qd7
      'capture', // Qxf7+
      'check',
    ]);
  });

  it('rounds the line off once the last piece has landed', () => {
    const { player, cues } = setup();
    player.play();
    vi.advanceTimersByTime(5 * 1500);
    expect(cues).toHaveLength(5);

    vi.advanceTimersByTime(374);
    expect(cues).toHaveLength(5);
    vi.advanceTimersByTime(1);

    expect(cues.at(-1)).toBe('complete');
  });

  it('does not round off a line that was paused before the last piece landed', () => {
    const { player, cues } = setup();
    player.play();
    vi.advanceTimersByTime(5 * 1500 + 100);

    player.pause();
    vi.advanceTimersByTime(10_000);

    expect(cues).not.toContain('complete');
  });

  it('is optional', () => {
    const silent = createPlayer({ board: setup().board });
    silent.load(italian);

    silent.play();

    expect(() => vi.advanceTimersByTime(5 * 1500 + 1000)).not.toThrow();
  });
});

describe('pausing', () => {
  it('takes back the highlight and the arrow, and nothing more happens', () => {
    const { player, happened } = setup();
    player.play();
    vi.advanceTimersByTime(1000);
    happened();

    player.pause();

    expect(happened()).toEqual(['clear annotations']);
    expect(player.snapshot).toMatchObject({ playing: false, ply: 0, pending: null });
    vi.advanceTimersByTime(10_000);
    expect(happened()).toEqual([]);
  });

  it('resumes by pointing the same move out again from the beginning', () => {
    const { player, happened } = setup();
    player.play();
    vi.advanceTimersByTime(1000);
    player.pause();
    happened();

    player.play();
    vi.advanceTimersByTime(1500);

    expect(happened()).toEqual([
      'highlight e2',
      'arrow e2e4 (375ms)',
      'position after 1 moves (last e2e4, 375ms)',
    ]);
  });

  it('toggles', () => {
    const { player } = setup();

    player.toggle();
    expect(player.snapshot.playing).toBe(true);

    player.toggle();
    expect(player.snapshot.playing).toBe(false);
  });
});

describe('stepping', () => {
  it('forward makes the next move straight away and stops the playback', () => {
    const { player, happened, cues } = setup();
    player.play();
    vi.advanceTimersByTime(700);
    happened();

    player.stepForward();

    expect(happened()).toEqual(['position after 1 moves (last e2e4, 375ms)']);
    expect(player.snapshot).toMatchObject({ playing: false, ply: 1, pending: null });
    expect(cues).toEqual(['move']);
    vi.advanceTimersByTime(10_000);
    expect(happened()).toEqual([]);
  });

  it('forward does nothing at the end of the line', () => {
    const { player, happened, cues } = setup();
    player.seek(5);
    happened();

    player.stepForward();

    expect(happened()).toEqual([]);
    expect(cues).toEqual([]);
    expect(player.snapshot.ply).toBe(5);
  });

  it('back returns to the position before, silently', () => {
    const { player, happened, cues } = setup();
    player.seek(2);
    happened();

    player.stepBack();

    expect(happened()).toEqual(['position after 1 moves (last e2e4, 375ms)']);
    expect(player.snapshot).toMatchObject({ playing: false, ply: 1 });

    player.stepBack();

    expect(happened()).toEqual(['position after 0 moves (last none, 375ms)']);
    expect(cues).toEqual([]);
  });

  it('back does nothing at the start', () => {
    const { player, happened } = setup();

    player.stepBack();

    expect(happened()).toEqual([]);
    expect(player.snapshot.ply).toBe(0);
  });
});

describe('seeking', () => {
  it('jumps straight to a position, without animation or sound', () => {
    const { player, happened, cues } = setup();

    player.seek(3);

    expect(happened()).toEqual(['position after 3 moves (last g1f3, 0ms)']);
    expect(player.snapshot).toMatchObject({ playing: false, ply: 3, pending: null });
    expect(cues).toEqual([]);
  });

  it('stays within the line', () => {
    const { player } = setup();

    player.seek(99);
    expect(player.snapshot.ply).toBe(5);

    player.seek(-3);
    expect(player.snapshot.ply).toBe(0);
  });

  it('carries on playing from there if it was playing', () => {
    const { player, happened } = setup();
    player.play();
    vi.advanceTimersByTime(700);
    happened();

    player.seek(3);
    expect(player.snapshot).toMatchObject({ playing: true, ply: 3, pending: null });
    vi.advanceTimersByTime(1500);

    expect(happened()).toEqual([
      'position after 3 moves (last g1f3, 0ms)',
      'highlight b8',
      'arrow b8c6 (375ms)',
      'position after 4 moves (last b8c6, 375ms)',
    ]);
  });

  it('to the end stops the playback', () => {
    const { player } = setup();
    player.play();

    player.seek(5);

    expect(player.snapshot).toMatchObject({ playing: false, ply: 5 });
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('restarting', () => {
  it('goes back to the start and plays', () => {
    const { player, happened } = setup();
    player.seek(4);
    happened();

    player.restart();

    expect(happened()).toEqual(['position after 0 moves (last none, 0ms)']);
    expect(player.snapshot).toMatchObject({ playing: true, ply: 0 });
    vi.advanceTimersByTime(600);
    expect(happened()).toEqual(['highlight e2']);
  });
});

describe('changing the delay', () => {
  it('sets the pace of the moves that follow', () => {
    const { player, happened } = setup();

    player.setDelay(400);
    player.play();
    vi.advanceTimersByTime(800);

    expect(player.snapshot).toMatchObject({ delayMs: 400, ply: 2 });
    expect(happened()).toEqual([
      'highlight e2',
      'arrow e2e4 (100ms)',
      'position after 1 moves (last e2e4, 120ms)',
      'highlight e7',
      'arrow e7e5 (100ms)',
      'position after 2 moves (last e7e5, 120ms)',
    ]);
  });

  it('takes effect at once, keeping its place in the move under way', () => {
    const { player, happened } = setup();
    player.play();
    vi.advanceTimersByTime(300); // a fifth of the way to the first move

    player.setDelay(3000); // still a fifth of the way: 600 of 3000, so the highlight is 600 off

    vi.advanceTimersByTime(599);
    expect(happened()).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(happened()).toEqual(['highlight e2']);
  });

  it('can hurry a move that is already being pointed out', () => {
    const { player, happened } = setup();
    player.play();
    vi.advanceTimersByTime(750); // halfway, highlight showing
    happened();

    player.setDelay(300); // halfway through 300: the arrow is 45 off, the move 150

    vi.advanceTimersByTime(45);
    expect(happened()).toEqual(['arrow e2e4 (75ms)']);
    vi.advanceTimersByTime(105);
    expect(happened()).toEqual(['position after 1 moves (last e2e4, 120ms)']);
  });

  it('keeps to the limits', () => {
    const { player } = setup();

    player.setDelay(10);
    expect(player.snapshot.delayMs).toBe(300);

    player.setDelay(1e9);
    expect(player.snapshot.delayMs).toBe(5000);
  });
});

describe('remembering the delay', () => {
  const remembered = (saved: number) => {
    const write = vi.fn();
    const player = createPlayer({ board: setup().board, delay: { read: () => saved, write } });
    return { player, write };
  };

  it('starts at the delay the viewer chose last time', () => {
    expect(remembered(2500).player.snapshot.delayMs).toBe(2500);
  });

  it('saves a new delay as it is set, within the limits', () => {
    const { player, write } = remembered(2500);

    player.setDelay(800);
    player.setDelay(5);

    expect(write.mock.calls).toEqual([[800], [300]]);
  });
});

describe('subscribing', () => {
  it('reports every change of state, cursor or pending move', () => {
    const { player } = setup();
    const seen: string[] = [];
    player.subscribe(({ playing, ply, pending }) => {
      seen.push(`${playing ? 'playing' : 'stopped'} ply ${ply} pending ${pending}`);
    });

    player.play();
    vi.advanceTimersByTime(1500);
    player.pause();

    expect(seen).toEqual([
      'playing ply 0 pending null',
      'playing ply 0 pending 0',
      'playing ply 1 pending null',
      'stopped ply 1 pending null',
    ]);
  });

  it('reports a restart once, not as a stop followed by a start', () => {
    const { player } = setup();
    player.seek(4);
    const listener = vi.fn();
    player.subscribe(listener);

    player.restart();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ playing: true, ply: 0 }));
  });

  it('reports a change of delay', () => {
    const { player } = setup();
    const delays: number[] = [];
    player.subscribe((snapshot) => delays.push(snapshot.delayMs));

    player.setDelay(800);

    expect(delays).toEqual([800]);
  });

  it('stops reporting once unsubscribed', () => {
    const { player } = setup();
    const listener = vi.fn();
    const unsubscribe = player.subscribe(listener);

    unsubscribe();
    player.play();

    expect(listener).not.toHaveBeenCalled();
  });
});
