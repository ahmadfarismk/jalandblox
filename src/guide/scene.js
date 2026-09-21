/**
 * The maths behind the 3D map (task S13). No three.js in here, so it can be
 * tested on its own.
 *
 * The scene is measured in metres, with the middle of the City Centre at
 * (0, 0). Looking at the screen: x runs east, z runs south, y is up. That
 * means north is "away from you", which is how a map normally sits.
 *
 * Latitude and longitude are not the same size in metres: a degree of
 * longitude shrinks as you move away from the equator. The `cos(latitude)`
 * below is the same correction the flat map uses in mapProjection.js.
 */

const M_PER_DEG_LAT = 111132;
const M_PER_DEG_LNG_EQUATOR = 111320;

/** The middle of a set of [lat, lng] points, or null if there are none. */
export function sceneCentre(points) {
  const valid = (points ?? []).filter(
    (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]),
  );
  if (valid.length === 0) return null;
  const lats = valid.map((p) => p[0]);
  const lngs = valid.map((p) => p[1]);
  return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
}

/**
 * Where a coordinate sits in the scene, in metres from the centre.
 * @returns {{x: number, z: number} | null}
 */
export function toScene(point, centre) {
  if (!Array.isArray(point) || !centre) return null;
  const [lat, lng] = point;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const mPerDegLng = M_PER_DEG_LNG_EQUATOR * Math.cos((centre[0] * Math.PI) / 180);
  return {
    x: (lng - centre[1]) * mPerDegLng,
    z: -(lat - centre[0]) * M_PER_DEG_LAT, // north is away from the viewer
  };
}

/** How far the furthest point sits from the centre, in metres. */
export function sceneRadius(points, centre) {
  const spots = (points ?? []).map((p) => toScene(p, centre)).filter(Boolean);
  if (spots.length === 0) return 0;
  return Math.max(...spots.map((s) => Math.hypot(s.x, s.z)));
}

/**
 * How far back the camera has to sit to fit everything in, in metres.
 * @param {number} radius   metres from the centre to the furthest landmark
 * @param {number} fovDeg   the camera's vertical angle
 * @param {number} aspect   screen width / height
 */
export function cameraDistance(radius, fovDeg = 45, aspect = 1) {
  const safeRadius = Math.max(radius, 100);
  const vertical = safeRadius / Math.tan((fovDeg * Math.PI) / 360);
  // A narrow phone screen needs more room sideways than a wide one.
  const horizontal = vertical / Math.max(aspect, 0.4);
  return Math.max(vertical, horizontal) * 1.15; // a little air around the edge
}

/**
 * Turns a building's outline into scene points, dropping anything unusable.
 * @param {{h: number, p: [number, number][]}} building
 * @returns {{height: number, points: {x: number, z: number}[]} | null}
 */
export function buildingToScene(building, centre) {
  const points = (building?.p ?? []).map((p) => toScene(p, centre)).filter(Boolean);
  if (points.length < 3) return null;
  const height = Number.isFinite(building.h) && building.h > 0 ? building.h : 12;
  return { height, points };
}
