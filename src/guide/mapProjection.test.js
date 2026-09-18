import { describe, expect, it } from 'vitest';
import { getPlaces } from '@/data';
import { boundsFor, fitToBox, projectPoint } from './mapProjection';

const KL_PLACES = getPlaces().map((p) => p.coords);

describe('boundsFor', () => {
  it('has nothing to show without usable coordinates', () => {
    expect(boundsFor([])).toBeNull();
    expect(boundsFor([null, undefined, 'TBC', [1]])).toBeNull();
  });

  it('ignores places whose coordinates are still TBC', () => {
    const bounds = boundsFor([[3.1, 101.7], null, ['TBC', 'TBC']]);
    expect(bounds).not.toBeNull();
  });

  it('gives a single place a box of its own, so nothing divides by zero', () => {
    const bounds = boundsFor([[3.1, 101.7]]);
    const at = projectPoint([3.1, 101.7], bounds);
    expect(at.left).toBeCloseTo(50, 5);
    expect(at.top).toBeCloseTo(50, 5);
  });
});

describe('projectPoint', () => {
  const bounds = boundsFor(KL_PLACES);

  it('places nothing without a box or a coordinate', () => {
    expect(projectPoint([3.1, 101.7], null)).toBeNull();
    expect(projectPoint(null, bounds)).toBeNull();
    expect(projectPoint(['TBC', 'TBC'], bounds)).toBeNull();
  });

  it('keeps every landmark inside the map', () => {
    for (const place of getPlaces()) {
      const at = projectPoint(place.coords, bounds);
      expect(at.left, place.id).toBeGreaterThanOrEqual(0);
      expect(at.left, place.id).toBeLessThanOrEqual(100);
      expect(at.top, place.id).toBeGreaterThanOrEqual(0);
      expect(at.top, place.id).toBeLessThanOrEqual(100);
    }
  });

  it('puts north up and east right', () => {
    const north = projectPoint([3.16, 101.7], bounds);
    const south = projectPoint([3.13, 101.7], bounds);
    const east = projectPoint([3.14, 101.72], bounds);
    const west = projectPoint([3.14, 101.68], bounds);
    expect(north.top).toBeLessThan(south.top);
    expect(east.left).toBeGreaterThan(west.left);
  });

  it('puts the real landmarks where they belong: Petronas north-east of KL Sentral', () => {
    const at = Object.fromEntries(getPlaces().map((p) => [p.id, projectPoint(p.coords, bounds)]));
    expect(at.petronas.top).toBeLessThan(at['kl-sentral'].top);
    expect(at.petronas.left).toBeGreaterThan(at['kl-sentral'].left);
    // KLCC Park sits right beside the towers.
    expect(Math.abs(at['klcc-park'].left - at.petronas.left)).toBeLessThan(10);
    // Petaling Street is south of Sultan Abdul Samad.
    expect(at['petaling-street'].top).toBeGreaterThan(at['abdul-samad'].top);
  });

  it('keeps the city the right shape: 1 km north looks like 1 km east', () => {
    // 0.009 degrees of latitude is about 1 km. The same distance in longitude
    // is a bigger number of degrees, and the projection has to undo that.
    const square = boundsFor([
      [3.14, 101.69],
      [3.149, 101.699],
    ]);
    const a = projectPoint([3.14, 101.69], square);
    const b = projectPoint([3.149, 101.699], square);
    const acrossX = Math.abs(b.left - a.left);
    const acrossY = Math.abs(b.top - a.top);
    // The box is square in real metres, so the two should be within a few percent.
    expect(Math.abs(acrossX - acrossY)).toBeLessThan(2);
  });
});

describe('fitToBox', () => {
  const square = boundsFor([
    [3.14, 101.69],
    [3.149, 101.699],
  ]);

  it('leaves the box alone without a usable shape', () => {
    expect(fitToBox(square, undefined)).toBe(square);
    expect(fitToBox(square, 0)).toBe(square);
    expect(fitToBox(null, 1.5)).toBeNull();
  });

  it('keeps a kilometre north the same length as a kilometre east', () => {
    // A tall drawing area, like a phone: 300 wide by 600 tall.
    const aspect = 300 / 600;
    const fitted = fitToBox(square, aspect);
    const a = projectPoint([3.14, 101.69], fitted);
    const b = projectPoint([3.149, 101.699], fitted);
    // Percentages become pixels: width * left%, height * top%.
    const acrossPx = (Math.abs(b.left - a.left) / 100) * 300;
    const downPx = (Math.abs(b.top - a.top) / 100) * 600;
    expect(Math.abs(acrossPx - downPx)).toBeLessThan(1);
  });

  it('adds space rather than moving the landmarks off centre', () => {
    const fitted = fitToBox(square, 0.5);
    const middleBefore = projectPoint([3.1445, 101.6945], square);
    const middleAfter = projectPoint([3.1445, 101.6945], fitted);
    expect(middleAfter.left).toBeCloseTo(middleBefore.left, 5);
    expect(middleAfter.top).toBeCloseTo(middleBefore.top, 5);
  });

  it('works the other way round on a wide screen', () => {
    const fitted = fitToBox(square, 2);
    const a = projectPoint([3.14, 101.69], fitted);
    const b = projectPoint([3.149, 101.699], fitted);
    const acrossPx = (Math.abs(b.left - a.left) / 100) * 800;
    const downPx = (Math.abs(b.top - a.top) / 100) * 400;
    expect(Math.abs(acrossPx - downPx)).toBeLessThan(1);
  });
});
