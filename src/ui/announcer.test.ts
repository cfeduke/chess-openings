// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { fakePlayer } from '../../tests/support/fake-player.ts';
import { ITALIAN_MOVES as italian } from '../../tests/support/lines.ts';
import { createAnnouncer } from './announcer.ts';

function setup() {
  const { player, emit } = fakePlayer({ moves: italian });
  const announcer = createAnnouncer(player);
  return { announcer, emit, said: () => announcer.element.textContent };
}

describe('the announcer', () => {
  it('is a polite live region that takes up no room on screen', () => {
    const { announcer } = setup();

    expect(announcer.element.getAttribute('role')).toBe('status');
    expect(announcer.element.classList.contains('visually-hidden')).toBe(true);
    expect(announcer.element.textContent).toBe('');
  });

  it('says each move as it is made, the way the move list names it', () => {
    const { emit, said } = setup();

    emit({ ply: 1 });
    expect(said()).toBe('1. e4');

    emit({ ply: 2 });
    expect(said()).toBe('1… e5');
  });

  it('says where a jump landed', () => {
    const { emit, said } = setup();

    emit({ ply: 5 });
    expect(said()).toBe('3. Bc4');

    emit({ ply: 0 });
    expect(said()).toBe('Start position');
  });

  it('keeps quiet when nothing has moved', () => {
    const { emit, said } = setup();
    emit({ ply: 1 });

    emit({ playing: true });
    emit({ pending: 1 });
    emit({ delayMs: 800 });

    expect(said()).toBe('1. e4');
  });

  it('says whatever else it is asked to', () => {
    const { announcer, said } = setup();

    announcer.say('Italian Game, 5 moves');

    expect(said()).toBe('Italian Game, 5 moves');
  });

  it('does not announce the start of a line that has just been loaded', () => {
    const { announcer, emit, said } = setup();
    emit({ ply: 3 });
    announcer.say('Ruy Lopez, 5 moves');

    emit({ moves: [...italian], ply: 0 });

    expect(said()).toBe('Ruy Lopez, 5 moves');
  });
});
