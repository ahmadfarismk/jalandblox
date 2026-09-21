import { describe, expect, it } from 'vitest';
import buildingsFile from './buildings.json';

// The building shapes are imported from OpenStreetMap by
// `npm run import:buildings` (task F14) and committed. These checks are about
// the file staying honest and small: the app draws it on a phone, and its
// licence needs the credit shown with it.
describe('buildings.json', () => {
  const { buildings, bbox } = buildingsFile;

  it('says where it came from and under what licence', () => {
    expect(buildingsFile.source).toMatch(/OpenStreetMap/);
    expect(buildingsFile.licence).toBe('ODbL');
    expect(buildingsFile.licenceUrl).toMatch(/^https:\/\//);
    expect(buildingsFile.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('stays small enough for a phone on mobile data', () => {
    const kb = new TextEncoder().encode(JSON.stringify(buildingsFile)).length / 1024;
    expect(buildings.length).toBeLessThanOrEqual(450);
    expect(kb).toBeLessThan(250);
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
