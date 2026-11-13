import { describe, expect, it } from 'vitest';
import { updateLichessData } from './update-lichess-data.ts';

const SHA = '0123456789abcdef0123456789abcdef01234567';

function fakeUpstream() {
  const requested: string[] = [];
  const written = new Map<string, string>();
  return {
    requested,
    written,
    io: {
      fetchText: async (url: string) => {
        requested.push(url);
        if (url.includes('api.github.com')) return JSON.stringify({ sha: SHA });
        return `eco\tname\tpgn\ncontents of ${url}\n`;
      },
      writeFile: async (path: string, contents: string) => {
        written.set(path, contents);
      },
      today: () => '2026-11-12',
    },
  };
}

describe('updateLichessData', () => {
  it('resolves the ref to a commit and downloads every volume pinned to it', async () => {
    const upstream = fakeUpstream();

    await updateLichessData('master', 'data/lichess', upstream.io);

    expect(upstream.requested).toEqual([
      'https://api.github.com/repos/lichess-org/chess-openings/commits/master',
      ...['a', 'b', 'c', 'd', 'e'].map(
        (volume) =>
          `https://raw.githubusercontent.com/lichess-org/chess-openings/${SHA}/${volume}.tsv`,
      ),
    ]);
    expect(upstream.written.get('data/lichess/c.tsv')).toContain(`${SHA}/c.tsv`);
  });

  it('records the pinned commit next to the data', async () => {
    const upstream = fakeUpstream();

    await updateLichessData('master', 'data/lichess', upstream.io);

    expect(JSON.parse(upstream.written.get('data/lichess/SOURCE.json') ?? '')).toEqual({
      repository: 'lichess-org/chess-openings',
      commit: SHA,
      license: 'CC0-1.0',
      retrieved: '2026-11-12',
    });
  });
});
