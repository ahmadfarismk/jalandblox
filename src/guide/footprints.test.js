import { describe, expect, it } from 'vitest';
import { centroidOf, matchFootprints, pointInRing } from './footprints';
import { getPlaces } from '@/data';
import city from '@/data/citymap.json';

// A square about 100 m across, around Sultan Abdul Samad.
const SQUARE = [
  [3.1481, 101.6939],
  [3.1491, 101.6939],
  [3.1491, 101.695],
  [3.1481, 101.695],
];

describe('pointInRing', () => {
  it('knows inside from outside', () => {
    expect(pointInRing([3.14861, 101.69444], SQUARE)).toBe(true);
    expect(pointInRing([3.16, 101.7], SQUARE)).toBe(false);
  });

  it('says no to a shape that is not a shape', () => {
    expect(pointInRing([3.1, 101.6], [])).toBe(false);
    expect(pointInRing([3.1, 101.6], undefined)).toBe(false);
  });
});

describe('centroidOf', () => {
  it('is the middle of the outline', () => {
    const [lat, lng] = centroidOf(SQUARE);
    expect(lat).toBeCloseTo(3.1486, 4);
    expect(lng).toBeCloseTo(101.69445, 4);
  });
});

describe('matchFootprints', () => {
  const places = [
    { id: 'inside', coords: [3.14861, 101.69444] },
    { id: 'faraway', coords: [3.2, 101.8] },
    { id: 'no-coords', coords: null },
  ];
  const buildings = [{ p: SQUARE }];

  it('matches a landmark standing inside a building', () => {
    expect(matchFootprints(places, buildings)).toEqual({ inside: 0 });
  });

  it('leaves out landmarks with nothing near them', () => {
    expect(matchFootprints([places[1]], buildings)).toEqual({});
  });

  it('picks the nearest building when the landmark sits just outside one', () => {
    const nextDoor = [{ p: SQUARE }, { p: SQUARE.map(([la, ln]) => [la + 0.0004, ln]) }];
    // 40 m north of the first square: still inside its own outline
    expect(matchFootprints([{ id: 'x', coords: [3.1493, 101.69444] }], nextDoor)).toEqual({ x: 1 });
  });

  it('finds real buildings for the towers on the real map', () => {
    const matched = matchFootprints(getPlaces(), city.buildings);
    // The three towers have a clear building of their own.
    expect(matched).toHaveProperty('petronas');
    expect(matched).toHaveProperty('merdeka-118');
    expect(matched).toHaveProperty('kl-tower');
    // Each landmark points at a real outline.
    for (const index of Object.values(matched)) {
      expect(city.buildings[index].p.length).toBeGreaterThanOrEqual(3);
    }
  });
});
