import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeOpenings } from '../../src/data/opening.ts';
import { LICHESS_DATA_DIR, loadDataset, VOLUME_FILES } from './dataset.ts';

// The whole real dataset, built once: the same code path `npm run build` uses.
const payload = loadDataset(LICHESS_DATA_DIR);
const openings = decodeOpenings(payload);

describe('the lichess dataset', () => {
  it('contains every upstream row', () => {
    const upstreamRows = VOLUME_FILES.map(
      (file) => readFileSync(`${LICHESS_DATA_DIR}/${file}`, 'utf8').trimEnd().split('\n').length - 1,
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
    expect(ids.filter((id) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))).toEqual([]);
  });

  it('gives every opening matching SAN and UCI move lists', () => {
    const broken = openings.filter(
      (opening) => opening.san.length === 0 || opening.san.length !== opening.uci.length,
    );

    expect(broken).toEqual([]);
  });

  it('knows the Najdorf', () => {
    expect(openings.find((opening) => opening.id === 'sicilian-defense-najdorf-variation')).toEqual({
      id: 'sicilian-defense-najdorf-variation',
      eco: 'B90',
      name: 'Sicilian Defense: Najdorf Variation',
      san: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
      uci: ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6'],
    });
  });

  it('records where the data came from', () => {
    expect(payload.source.repository).toBe('lichess-org/chess-openings');
    expect(payload.source.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(payload.source.license).toBe('CC0-1.0');
  });
});
