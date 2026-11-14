import { describe, expect, it, vi } from 'vitest';
import { SMALL_DATASET } from '../../tests/support/openings.ts';
import { SMALL_DETAIL, SMALL_STATISTICS } from '../../tests/support/statistics.ts';
import { loadDetail, loadOpenings, loadStatistics } from './load.ts';

const respondWith = (response: Partial<Response>) => vi.fn(async () => response as Response);

describe('loadOpenings', () => {
  it('fetches the dataset the build put next to the page', async () => {
    const fetch = respondWith({ ok: true, json: async () => SMALL_DATASET });

    const dataset = await loadOpenings(fetch);

    expect(fetch).toHaveBeenCalledWith('/openings.json');
    expect(dataset).toEqual(SMALL_DATASET);
  });

  it('fails with the status when the server does not have it', async () => {
    const fetch = respondWith({ ok: false, status: 404 });

    await expect(loadOpenings(fetch)).rejects.toThrow(/openings\.json.*404/);
  });

  it('lets a network failure through', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(loadOpenings(fetch)).rejects.toThrow('Failed to fetch');
  });
});

describe('loadStatistics', () => {
  it('fetches the statistics the build put next to the page', async () => {
    const fetch = respondWith({ ok: true, json: async () => SMALL_STATISTICS });

    const statistics = await loadStatistics(fetch);

    expect(fetch).toHaveBeenCalledWith('/statistics.json');
    expect(statistics).toEqual(SMALL_STATISTICS);
  });

  it('fails with the status when the server does not have them', async () => {
    const fetch = respondWith({ ok: false, status: 404 });

    await expect(loadStatistics(fetch)).rejects.toThrow(/statistics\.json.*404/);
  });
});

describe('loadDetail', () => {
  it('fetches one file of the detail, by its number', async () => {
    const fetch = respondWith({ ok: true, json: async () => SMALL_DETAIL });

    const chunk = await loadDetail(7, fetch);

    expect(fetch).toHaveBeenCalledWith('/statistics/7.json');
    expect(chunk).toEqual(SMALL_DETAIL);
  });

  it('fails with the status when the server does not have it', async () => {
    const fetch = respondWith({ ok: false, status: 404 });

    await expect(loadDetail(7, fetch)).rejects.toThrow(/statistics\/7\.json.*404/);
  });
});
