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

/**
 * Turns a line (a road, a river) into a flat ribbon of the given width, as
 * triangles laid on the ground.
 *
 * A line on its own would be a hairline on a phone. This gives every road a
 * real width in metres, so the street grid reads as a street grid.
 *
 * @param {{x: number, z: number}[]} points  the line, in scene metres
 * @param {number} width                     how wide to draw it, in metres
 * @returns {number[]} x, y, z for each triangle corner, flat on the ground
 */
export function ribbon(points, width) {
  const out = [];
  const half = Math.max(width, 1) / 2;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    if (!length) continue;
    // Sideways from the direction of travel.
    const nx = (-dz / length) * half;
    const nz = (dx / length) * half;
    const corners = [
      [a.x + nx, a.z + nz],
      [a.x - nx, a.z - nz],
      [b.x - nx, b.z - nz],
      [b.x + nx, b.z + nz],
    ];
    for (const [c1, c2, c3] of [
      [corners[0], corners[1], corners[2]],
      [corners[0], corners[2], corners[3]],
    ]) {
      out.push(c1[0], 0, c1[1], c2[0], 0, c2[1], c3[0], 0, c3[1]);
    }
  }
  return out;
}
