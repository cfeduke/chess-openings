/**
 * A stand-in for the Web Audio API that builds no sound, only a record of what was asked for:
 * which nodes exist, how they are wired, and what was scheduled on them.
 */

type Ramp = 'set' | 'linear' | 'exponential';

export class FakeParam {
  value = 0;
  /** Every scheduled change: how the value gets there, what it becomes, and when. */
  readonly events: { ramp: Ramp; value: number; time: number }[] = [];

  setValueAtTime(value: number, time: number) {
    this.events.push({ ramp: 'set', value, time });
    return this;
  }

  linearRampToValueAtTime(value: number, time: number) {
    this.events.push({ ramp: 'linear', value, time });
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number) {
    if (value <= 0) throw new RangeError('an exponential ramp cannot reach zero');
    this.events.push({ ramp: 'exponential', value, time });
    return this;
  }

  /** The largest value the parameter is ever given. */
  get peak(): number {
    return Math.max(this.value, ...this.events.map((event) => event.value));
  }
}

export class FakeNode {
  readonly outputs: FakeNode[] = [];

  connect<T extends FakeNode>(target: T): T {
    this.outputs.push(target);
    return target;
  }

  /** Whether sound from this node can arrive at `target`. */
  reaches(target: FakeNode): boolean {
    return this.outputs.some((output) => output === target || output.reaches(target));
  }
}

/** A node that makes sound for a stretch of time: an oscillator or a buffer being played. */
export class FakeSource extends FakeNode {
  startedAt: number | undefined;
  stoppedAt: number | undefined;

  start(time = 0) {
    this.startedAt = time;
  }

  stop(time = 0) {
    this.stoppedAt = time;
  }
}

export class FakeOscillator extends FakeSource {
  type = 'sine';
  readonly frequency = new FakeParam();
}

export class FakeBufferSource extends FakeSource {
  buffer: unknown = null;
}

export class FakeGain extends FakeNode {
  readonly gain = new FakeParam();

  constructor() {
    super();
    this.gain.value = 1;
  }
}

export class FakeFilter extends FakeNode {
  type = 'lowpass';
  readonly frequency = new FakeParam();
  readonly Q = new FakeParam();
}

export class FakeAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime = 10;
  readonly sampleRate = 44_100;
  readonly destination = new FakeNode();

  readonly oscillators: FakeOscillator[] = [];
  readonly bufferSources: FakeBufferSource[] = [];
  readonly gains: FakeGain[] = [];
  buffersCreated = 0;
  /** Set to make `resume()` fail, as a browser does without a user gesture. */
  refusesToResume = false;

  get sources(): FakeSource[] {
    return [...this.oscillators, ...this.bufferSources];
  }

  createOscillator() {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createBufferSource() {
    const source = new FakeBufferSource();
    this.bufferSources.push(source);
    return source;
  }

  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }

  createBiquadFilter() {
    return new FakeFilter();
  }

  createBuffer(_channels: number, length: number) {
    this.buffersCreated += 1;
    const samples = new Float32Array(length);
    return { getChannelData: () => samples };
  }

  resume(): Promise<void> {
    if (this.refusesToResume) return Promise.reject(new Error('not allowed to start'));
    this.state = 'running';
    return Promise.resolve();
  }
}

/** Passes a fake where the code under test expects the real thing. */
export function asAudioContext(fake: FakeAudioContext): AudioContext {
  return fake as unknown as AudioContext;
}
