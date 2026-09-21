/**
 * Which building on the map belongs to which landmark (task S13).
 *
 * The imported buildings are plain shapes from OpenStreetMap with no names, so
 * the app works out which one is Petronas by where it sits: the landmark's
 * coordinates fall inside the outline, or the outline's middle is within a few
 * dozen metres. Those buildings are then drawn in gold once the stamp is
 * earned, instead of staying grey like the rest of the city.
 *
 * A landmark that is a street, a park or a station forecourt often has no
 * single building, and that is fine: it keeps its marker and nothing is
 * coloured in. Better nothing than the wrong building.
 */
import { metresBetween } from '@/core/geo';

/** The middle of an outline, as [lat, lng]. */
export function centroidOf(points) {
  if (!points?.length) return null;
  const lat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const lng = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  return [lat, lng];
}

/** Roughly how big an outline is, in square metres. */
export function areaOf(ring) {
  if (!ring?.length) return 0;
  const mPerDegLat = 111132;
  const mPerDegLng = 111320 * Math.cos((ring[0][0] * Math.PI) / 180);
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lat1, lng1] = ring[j];
    const [lat2, lng2] = ring[i];
    sum += lng1 * mPerDegLng * (lat2 * mPerDegLat) - lng2 * mPerDegLng * (lat1 * mPerDegLat);
  }
  return Math.abs(sum / 2);
}

/** Is this coordinate inside the outline? (ray casting, the usual way) */
export function pointInRing([lat, lng], ring) {
  if (!ring || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i];
    const [latJ, lngJ] = ring[j];
    const crosses = latI > lat !== latJ > lat;
    if (crosses && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI) inside = !inside;
  }
  return inside;
}

/**
 * The building for each landmark, where there is an obvious one.
 * @param {{id: string, coords: [number, number] | null}[]} places
 * @param {{p: [number, number][]}[]} buildings
 * @param {number} [maxMetres] how far the middle of a building may be
 * @returns {Record<string, number>} landmark id -> index in `buildings`
 */
export function matchFootprints(places, buildings, maxMetres = 70) {
  const found = {};
  for (const place of places ?? []) {
    if (!place?.coords) continue;
    let best = null;
    (buildings ?? []).forEach((building, index) => {
      const ring = building?.p;
      if (!ring?.length) return;
      // Standing inside the outline beats anything nearby. When a landmark
      // sits inside several outlines (a tower inside its own shopping
      // podium), the smallest one is the building itself.
      if (pointInRing(place.coords, ring)) {
        const area = areaOf(ring);
        if (!best || best.distance > 0 || area < best.area) best = { index, distance: 0, area };
        return;
      }
      if (best?.distance === 0) return; // already standing in one
      const distance = metresBetween(place.coords, centroidOf(ring));
      if (distance <= maxMetres && (!best || distance < best.distance)) {
        best = { index, distance, area: areaOf(ring) };
      }
    });
    if (best) found[place.id] = best.index;
  }
  return found;
}
