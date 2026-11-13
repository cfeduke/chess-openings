import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isSlug } from '../../src/text/slug.ts';
import { realOpenings as openings, realDataset } from '../../tests/support/real-openings.ts';
import { DATA_DIR, loadDataset } from './dataset.ts';
import { LICHESS_DIR, SOURCE_FILE, VOLUME_FILES } from './lichess.ts';
import { WIKIBOOKS_DIR } from './wikibooks.ts';

const LICHESS_DATA_DIR = join(DATA_DIR, LICHESS_DIR);

describe('the dataset', () => {
  it('is a list of collections, of which the encyclopaedia is the first', () => {
    expect(realDataset.collections.map((collection) => collection.id)).toEqual([
      'eco',
      'wikibooks',
    ]);
    expect(realDataset.collections[0]?.openings).toBe(openings);
  });

  it('keeps what is only true of a book’s lines out of the encyclopaedia’s', () => {
    expect(openings.filter((opening) => 'page' in opening)).toEqual([]);
  });
});

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

  it('says where the data came from: the repository, at the commit it is pinned to', () => {
    const { commit } = JSON.parse(readFileSync(join(LICHESS_DATA_DIR, SOURCE_FILE), 'utf8'));

    expect(commit).toMatch(/^[0-9a-f]{40}$/);
    expect(realDataset.collections[0]?.source).toEqual({
      title: 'lichess-org/chess-openings',
      url: `https://github.com/lichess-org/chess-openings/tree/${commit}`,
      revision: commit.slice(0, 7),
      license: 'CC0-1.0',
    });
  });
});

describe('loadDataset', () => {
  it('refuses data whose provenance record is incomplete', () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'openings-data-'));
    cpSync(DATA_DIR, dataDir, { recursive: true });
    writeFileSync(
      join(dataDir, LICHESS_DIR, SOURCE_FILE),
      JSON.stringify({ repository: 'lichess-org/chess-openings' }),
    );

    expect(() => loadDataset(dataDir)).toThrow(/lichess\/SOURCE\.json: missing "commit"/);
  });

  it('refuses a book whose provenance record is incomplete', () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'openings-data-'));
    cpSync(DATA_DIR, dataDir, { recursive: true });
    writeFileSync(
      join(dataDir, WIKIBOOKS_DIR, SOURCE_FILE),
      JSON.stringify({ book: 'Chess Opening Theory', site: 'en.wikibooks.org', license: 'X' }),
    );

    expect(() => loadDataset(dataDir)).toThrow(/wikibooks\/SOURCE\.json: missing "retrieved"/);
  });
});
