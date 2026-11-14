// Refreshes the vendored opening data: `node scripts/update-lichess-data.ts [ref]`.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR } from './openings/dataset.ts';
import { LICHESS_DIR, type VendoredSource, VOLUME_FILES } from './openings/lichess.ts';
import { formatSourceFile, SOURCE_FILE, today } from './openings/source.ts';

const REPOSITORY = 'lichess-org/chess-openings';

interface UpdateIo {
  fetchText(url: string): Promise<string>;
  writeFile(path: string, contents: string): Promise<void>;
  /** Today's date as `YYYY-MM-DD`. */
  today(): string;
}

/**
 * Downloads every volume at the commit `ref` currently points to and records that commit,
 * so the vendored data is always pinned to one upstream revision.
 */
export async function updateLichessData(
  ref: string,
  dataDir: string,
  io: UpdateIo,
): Promise<string> {
  const { sha } = JSON.parse(
    await io.fetchText(`https://api.github.com/repos/${REPOSITORY}/commits/${ref}`),
  );

  for (const file of VOLUME_FILES) {
    const contents = await io.fetchText(
      `https://raw.githubusercontent.com/${REPOSITORY}/${sha}/${file}`,
    );
    await io.writeFile(join(dataDir, file), contents);
  }

  const source: VendoredSource = {
    repository: REPOSITORY,
    commit: sha,
    license: 'CC0-1.0',
    retrieved: io.today(),
  };
  await io.writeFile(join(dataDir, SOURCE_FILE), formatSourceFile(source));
  return sha;
}

if (import.meta.main) {
  const dataDir = join(DATA_DIR, LICHESS_DIR);
  const sha = await updateLichessData(process.argv[2] ?? 'master', dataDir, {
    fetchText: async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      return response.text();
    },
    writeFile,
    today,
  });
  console.log(`${dataDir}: now at ${REPOSITORY}@${sha}. Run "npm run verify" before committing.`);
}
