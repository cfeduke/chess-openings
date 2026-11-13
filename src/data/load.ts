import type { OpeningsDataset } from './opening.ts';

/** Fetches the dataset that `npm run data` generated and the build put next to the page. */
export async function loadOpenings(
  fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<OpeningsDataset> {
  const url = `${import.meta.env.BASE_URL}openings.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}
