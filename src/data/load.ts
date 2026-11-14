import type { StatisticsData } from '../statistics/data.ts';
import type { OpeningsDataset } from './opening.ts';

type Fetch = typeof globalThis.fetch;

/** Fetches one of the files that `npm run data` generated and the build put next to the page. */
async function load<Data>(file: string, fetch: Fetch): Promise<Data> {
  const url = `${import.meta.env.BASE_URL}${file}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

/** Fetches the openings. */
export const loadOpenings = (fetch: Fetch = globalThis.fetch) =>
  load<OpeningsDataset>('openings.json', fetch);

/** Fetches what lichess's games say of the openings, at a glance. */
export const loadStatistics = (fetch: Fetch = globalThis.fetch) =>
  load<StatisticsData>('statistics.json', fetch);
