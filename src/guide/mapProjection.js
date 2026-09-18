/**
 * Putting a coordinate in the right place on the Map screen (task S7).
 *
 * The plan's map library (MapLibre GL JS) needs a hosted tile service, and
 * which one to use is still an open question for the team (docs/PLAN.md
 * section 16). Until that is decided, the Map screen draws the landmarks
 * itself: no street tiles, but every icon sits in its true position relative
 * to the others, which is what task S7 asks for.
 *
 * The maths is the same flat projection every map uses close up: longitude
 * shrinks towards the poles, so it is scaled by cos(latitude). Over a few
 * kilometres of KL the error is far smaller than one pixel.
 */

/** Degrees to radians. */
const rad = (deg) => (deg * Math.PI) / 180;

/** A point is [latitude, longitude], the same order as places.json. */
const isPoint = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);

/**
 * The box that holds every point, with a margin so nothing sits on the edge.
 * Returns null when there is nothing to show.
 *
 * @param {[number, number][]} points
 * @param {number} [margin] share of the box added on each side, 0.15 = 15%
 */
export function boundsFor(points, margin = 0.15) {
  const usable = points.filter(isPoint);
  if (usable.length === 0) return null;

  const lats = usable.map((p) => p[0]);
  const lngs = usable.map((p) => p[1]);
  const centreLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const scale = Math.cos(rad(centreLat));

  // Work in "flat" units so the box keeps the real shape of the city.
  let minX = Math.min(...lngs) * scale;
  let maxX = Math.max(...lngs) * scale;
  let minY = Math.min(...lats);
  let maxY = Math.max(...lats);

  // A single point (or a straight line of them) has no width or height to
  // divide by, so give the box a small size of its own.
  const width = maxX - minX || 0.01;
  const height = maxY - minY || 0.01;
  minX -= width * margin;
  maxX += width * margin;
  minY -= height * margin;
  maxY += height * margin;

  return { minX, maxX, minY, maxY, scale };
}

/**
 * Where a point goes inside the box, as percentages from the top left.
 * Returns null for a point we cannot place (coordinates still TBC).
 *
 * @param {[number, number]} point [latitude, longitude]
 * @param {ReturnType<typeof boundsFor>} bounds
 * @returns {{ left: number, top: number } | null}
 */
export function projectPoint(point, bounds) {
  if (!bounds || !isPoint(point)) return null;
  const x = point[1] * bounds.scale;
  const left = ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * 100;
  // North is up, so a bigger latitude means a smaller distance from the top.
  const top = ((bounds.maxY - point[0]) / (bounds.maxY - bounds.minY)) * 100;
  return { left, top };
}

/**
 * Stretch the box so it has the same shape as the space it is drawn in.
 *
 * Without this, a tall box on a phone would stretch the city north to south:
 * two landmarks a kilometre apart east to west would look closer than two a
 * kilometre apart north to south. Widening (or heightening) the box instead of
 * the city keeps the shape honest and simply shows a little more empty space.
 *
 * @param {ReturnType<typeof boundsFor>} bounds
 * @param {number} aspect the drawing area's width divided by its height
 */
export function fitToBox(bounds, aspect) {
  if (!bounds || !Number.isFinite(aspect) || aspect <= 0) return bounds;

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const centreX = (bounds.minX + bounds.maxX) / 2;
  const centreY = (bounds.minY + bounds.maxY) / 2;

  // The box is drawn `aspect` times wider than it is tall, so its own width
  // has to be `aspect` times its height for the shape to survive.
  const wanted = height * aspect;
  if (wanted > width) {
    const half = wanted / 2;
    return { ...bounds, minX: centreX - half, maxX: centreX + half };
  }

  const half = width / aspect / 2;
  return { ...bounds, minY: centreY - half, maxY: centreY + half };
}
