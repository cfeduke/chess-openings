import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isSlug } from '../../src/text/slug.ts';
import { realDataset } from '../../tests/support/real-openings.ts';
import { LICHESS_DATA_DIR, loadDataset, SOURCE_FILE, VOLUME_FILES } from './dataset.ts';

const { source, openings } = realDataset;

describe('the lichess dataset', () => {
  it('contains every upstream row', () => {
    const upstreamRows = VOLUME_FILES.map(
      (file) =>
        readFileSync(`${LICHESS_DATA_DIR}/${file}`, 'utf8').trimEnd().split('\n').length - 1,
    ).reduce((sum, rows) => sum + rows, 0);

    expect(openings).toHaveLength(upstreamRows);
    expect(openings.length).toBeGreaterThan(3800);
  });

  it('covers all 500 ECO codes, A00 through E99', () => {
    expect(new Set(openings.map((opening) => opening.eco)).size).toBe(500);
  });

  it('gives every opening a unique, URL-safe id', () => {
    const ids = openings.map((opening) => opening.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => !isSlug(id))).toEqual([]);
  });

  it('gives every opening matching SAN and UCI move lists', () => {
    const broken = openings.filter(
      (opening) => opening.san.length === 0 || opening.san.length !== opening.uci.length,
    );

    expect(broken).toEqual([]);
  });

  it('knows the Najdorf', () => {
    expect(openings.find((opening) => opening.id === 'sicilian-defense-najdorf-variation')).toEqual(
      {
        id: 'sicilian-defense-najdorf-variation',
        eco: 'B90',
        name: 'Sicilian Defense: Najdorf Variation',
        san: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
        uci: ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6'],
      },
    );
  });

  it('records where the data came from', () => {
    expect(source).toEqual({
      repository: 'lichess-org/chess-openings',
      commit: expect.stringMatching(/^[0-9a-f]{40}$/),
      license: 'CC0-1.0',
    });
  });
});

describe('loadDataset', () => {
  it('refuses data whose provenance record is incomplete', () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'lichess-data-'));
    cpSync(LICHESS_DATA_DIR, dataDir, { recursive: true });
    writeFileSync(
      join(dataDir, SOURCE_FILE),
      JSON.stringify({ repository: 'lichess-org/chess-openings' }),
    );

    expect(() => loadDataset(dataDir)).toThrow(/SOURCE\.json: missing "commit"/);
  });
});
