import { describe, expect, it } from 'vitest';
import cityFile from './citymap.json';

// The city map is imported from OpenStreetMap by
// `npm run import:citymap` (task F14) and committed. These checks are about
// the file staying honest and small: the app draws it on a phone, and its
// licence needs the credit shown with it.
describe('citymap.json', () => {
  const { buildings, roads, water, waterways, green, bbox } = cityFile;

  it('says where it came from and under what licence', () => {
    expect(cityFile.source).toMatch(/OpenStreetMap/);
    expect(cityFile.licence).toBe('ODbL');
    expect(cityFile.licenceUrl).toMatch(/^https:\/\//);
    expect(cityFile.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('stays small enough for a phone on mobile data', () => {
    const kb = new TextEncoder().encode(JSON.stringify(cityFile)).length / 1024;
    expect(buildings.length).toBeLessThanOrEqual(450);
    expect(roads.length).toBeLessThanOrEqual(1400);
    expect(kb).toBeLessThan(400);
  });

  it('has the layers that make it look like a map, not a pile of blocks', () => {
    expect(roads.length).toBeGreaterThan(200); // the street grid
    expect(green.length).toBeGreaterThan(10); // parks
    expect(waterways.length + water.length).toBeGreaterThan(0); // the rivers KL is named after
    for (const road of roads) {
      expect(road.p.length).toBeGreaterThanOrEqual(2);
      expect(road.w).toBeGreaterThan(0);
    }
  });

  it('holds only usable outlines, inside the City Centre box', () => {
    const [south, west, north, east] = bbox;
    for (const building of buildings) {
      expect(building.p.length).toBeGreaterThanOrEqual(3);
      expect(building.h).toBeGreaterThan(0);
      expect(building.h).toBeLessThanOrEqual(700); // taller than Merdeka 118 is a data error
      for (const [lat, lng] of building.p) {
        expect(lat).toBeGreaterThanOrEqual(south - 0.01);
        expect(lat).toBeLessThanOrEqual(north + 0.01);
        expect(lng).toBeGreaterThanOrEqual(west - 0.01);
        expect(lng).toBeLessThanOrEqual(east + 0.01);
      }
    }
  });

  it('covers the landmarks: the box holds every check-in spot', async () => {
    const { getPlaces } = await import('./index');
    const [south, west, north, east] = bbox;
    for (const place of getPlaces()) {
      const [lat, lng] = place.coords;
      expect(lat >= south && lat <= north && lng >= west && lng <= east).toBe(true);
    }
  });
});
