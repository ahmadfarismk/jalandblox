import { describe, expect, it } from 'vitest';
import {
  MARKER_GREY,
  hasOwnShape,
  labelHeight,
  makeLandmark,
  setLandmarkColour,
} from './landmarkShapes';
import { getPlaces } from '@/data';

const colours = (group) =>
  group.userData.painted.map(({ material }) => material.getHex?.() ?? material.color.getHex());

describe('landmark shapes', () => {
  it('draws a shape for every check-in spot except the one OpenStreetMap already has', () => {
    const drawn = getPlaces()
      .map((place) => place.id)
      .filter((id) => hasOwnShape(id));
    expect(drawn).toHaveLength(6);
    // Merdeka 118 is in the map data at its real 679 m, so it is not drawn.
    expect(hasOwnShape('merdeka-118')).toBe(false);
  });

  it('builds something for every landmark, even one with no shape of its own', () => {
    for (const place of getPlaces()) {
      const group = makeLandmark(place.id);
      expect(group.children.length).toBeGreaterThan(0);
      expect(group.userData.painted.length).toBeGreaterThan(0);
    }
  });

  it('starts grey and turns to the landmark’s own colours when collected', () => {
    const gate = makeLandmark('petaling-street');
    expect(colours(gate).every((colour) => colour === MARKER_GREY)).toBe(true);

    setLandmarkColour(gate, true);
    const painted = colours(gate);
    expect(painted.every((colour) => colour === MARKER_GREY)).toBe(false);
    // The gate is red, green and gold: more than one colour.
    expect(new Set(painted).size).toBeGreaterThan(1);

    setLandmarkColour(gate, false);
    expect(colours(gate).every((colour) => colour === MARKER_GREY)).toBe(true);
  });

  it('floats a name above each landmark, higher for the towers', () => {
    expect(labelHeight('petronas')).toBeGreaterThan(labelHeight('abdul-samad'));
    expect(labelHeight('merdeka-118')).toBeGreaterThan(labelHeight('petronas'));
    expect(labelHeight('anything-else')).toBe(88);
  });

  it('does not mind being asked to colour nothing', () => {
    expect(() => setLandmarkColour(undefined, true)).not.toThrow();
    expect(() => setLandmarkColour({}, false)).not.toThrow();
  });
});
