import { describe, expect, it } from 'vitest';
import {
  buildingToScene,
  cameraDistance,
  ribbon,
  sceneCentre,
  sceneRadius,
  toScene,
} from './scene';

// Sultan Abdul Samad, near the middle of the City Centre.
const CENTRE = [3.14861, 101.69444];

describe('sceneCentre', () => {
  it('is the middle of the box around the points', () => {
    const [lat, lng] = sceneCentre([
      [3.1, 101.6],
      [3.2, 101.8],
    ]);
    expect(lat).toBeCloseTo(3.15, 6);
    expect(lng).toBeCloseTo(101.7, 6);
  });

  it('ignores points with no coordinates yet', () => {
    const centre = sceneCentre([[3.1, 101.6], null, [3.3, 101.6], ['x', 'y']]);
    expect(centre[0]).toBeCloseTo(3.2, 6);
    expect(centre[1]).toBeCloseTo(101.6, 6);
  });

  it('is null with nothing to place', () => {
    expect(sceneCentre([])).toBeNull();
    expect(sceneCentre()).toBeNull();
  });
});

describe('toScene', () => {
  it('puts the centre at zero', () => {
    const here = toScene(CENTRE, CENTRE);
    expect(here.x).toBeCloseTo(0, 6);
    expect(here.z).toBeCloseTo(0, 6);
  });

  it('measures in metres: 0.001° of latitude is about 111 m', () => {
    const north = toScene([CENTRE[0] + 0.001, CENTRE[1]], CENTRE);
    expect(Math.round(north.z)).toBe(-111); // north is away from the viewer
    expect(Math.round(north.x)).toBe(0);
  });

  it('shrinks longitude the way the real world does', () => {
    const east = toScene([CENTRE[0], CENTRE[1] + 0.001], CENTRE);
    // Near the equator a degree of longitude is nearly as long as one of latitude
    expect(Math.round(east.x)).toBe(111);
    expect(east.z).toBeCloseTo(0, 6);
  });

  it('is null for a place whose coordinates are still TBC', () => {
    expect(toScene(null, CENTRE)).toBeNull();
    expect(toScene([undefined, undefined], CENTRE)).toBeNull();
    expect(toScene(CENTRE, null)).toBeNull();
  });
});

describe('sceneRadius', () => {
  it('is the distance to the furthest point', () => {
    const points = [CENTRE, [CENTRE[0] + 0.002, CENTRE[1]]]; // about 222 m north
    expect(Math.round(sceneRadius(points, CENTRE))).toBe(222);
  });

  it('is zero with nothing to measure', () => {
    expect(sceneRadius([], CENTRE)).toBe(0);
  });
});

describe('cameraDistance', () => {
  it('moves further back for a bigger city', () => {
    expect(cameraDistance(2000)).toBeGreaterThan(cameraDistance(1000));
  });

  it('moves further back on a narrow phone than on a wide screen', () => {
    expect(cameraDistance(1000, 45, 0.5)).toBeGreaterThan(cameraDistance(1000, 45, 1.8));
  });

  it('keeps a sensible distance even with one point', () => {
    expect(cameraDistance(0)).toBeGreaterThan(100);
  });
});

describe('buildingToScene', () => {
  const ring = [CENTRE, [CENTRE[0] + 0.0005, CENTRE[1]], [CENTRE[0], CENTRE[1] + 0.0005]];

  it('turns an outline into scene points and keeps its height', () => {
    const shape = buildingToScene({ h: 35, p: ring }, CENTRE);
    expect(shape.height).toBe(35);
    expect(shape.points).toHaveLength(3);
    expect(shape.points[0].x).toBeCloseTo(0, 6);
    expect(shape.points[0].z).toBeCloseTo(0, 6);
  });

  it('gives a building with no height a sensible one', () => {
    expect(buildingToScene({ p: ring }, CENTRE).height).toBe(12);
    expect(buildingToScene({ h: 0, p: ring }, CENTRE).height).toBe(12);
  });

  it('drops shapes that are not shapes', () => {
    expect(buildingToScene({ h: 10, p: [CENTRE] }, CENTRE)).toBeNull();
    expect(buildingToScene({}, CENTRE)).toBeNull();
  });
});

describe('ribbon', () => {
  const line = [
    { x: 0, z: 0 },
    { x: 100, z: 0 },
  ];

  it('turns one straight length into two triangles', () => {
    const out = ribbon(line, 10);
    expect(out).toHaveLength(18); // 2 triangles x 3 corners x 3 numbers
  });

  it('gives the road its width, sideways from the way it runs', () => {
    const out = ribbon(line, 10);
    const zs = [];
    for (let i = 2; i < out.length; i += 3) zs.push(out[i]);
    expect(Math.max(...zs)).toBeCloseTo(5, 6); // half of 10 m either side
    expect(Math.min(...zs)).toBeCloseTo(-5, 6);
  });

  it('lies flat on the ground', () => {
    const out = ribbon(line, 8);
    for (let i = 1; i < out.length; i += 3) expect(out[i]).toBe(0);
  });

  it('follows every bend', () => {
    const bent = [...line, { x: 100, z: 100 }];
    expect(ribbon(bent, 10)).toHaveLength(36); // two lengths
  });

  it('skips points that sit on top of each other, and lines too short to draw', () => {
    expect(
      ribbon(
        [
          { x: 0, z: 0 },
          { x: 0, z: 0 },
        ],
        10,
      ),
    ).toEqual([]);
    expect(ribbon([{ x: 0, z: 0 }], 10)).toEqual([]);
    expect(ribbon([], 10)).toEqual([]);
  });
});
