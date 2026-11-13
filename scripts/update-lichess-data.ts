// Refreshes the vendored opening data: `node scripts/update-lichess-data.ts [ref]`.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  LICHESS_DATA_DIR,
  SOURCE_FILE,
  type VendoredSource,
  VOLUME_FILES,
} from './openings/dataset.ts';

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
  await io.writeFile(join(dataDir, SOURCE_FILE), `${JSON.stringify(source, null, 2)}\n`);
  return sha;
}

if (import.meta.main) {
  const sha = await updateLichessData(process.argv[2] ?? 'master', LICHESS_DATA_DIR, {
    fetchText: async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      return response.text();
    },
    writeFile,
    today: () => new Date().toISOString().slice(0, 10),
  });
  console.log(
    `${LICHESS_DATA_DIR}: now at ${REPOSITORY}@${sha}. Run "npm run verify" before committing.`,
  );
}
