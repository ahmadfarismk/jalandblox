import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getPlaces } from './index';

// Landmark photos are other people's work: each one needs its credit and
// licence, shown on the Landmark screen. See photoCredit in places.json.
describe('landmark photos', () => {
  it.each(getPlaces().map((p) => [p.id, p]))('%s has its photo file and a full credit', (id, p) => {
    expect(existsSync(`public${p.photo}`)).toBe(true);
    expect(p.photoCredit.author).toBeTruthy();
    expect(p.photoCredit.licence).toMatch(/^(CC0|CC BY|CC BY-SA|Public domain)/);
    expect(p.photoCredit.source).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  });
});
