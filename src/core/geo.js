/**
 * Straight-line distance in metres between two [lat, lng] points (haversine formula).
 * Shared by the fake and real location code.
 * @param {[number, number]} a
 * @param {[number, number]} b
 * @returns {number}
 */
export function metresBetween([lat1, lng1], [lat2, lng2]) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/**
 * Metres from a position to a place, or null if the place has no coordinates yet
 * (still "TBC") or the position is missing.
 * @param {{ coords: [number, number] | null } | null} place
 * @param {{ lat: number, lng: number } | null} position
 * @returns {number | null}
 */
export function distanceToPlace(place, position) {
  if (!place?.coords || !Number.isFinite(position?.lat) || !Number.isFinite(position?.lng)) {
    return null;
  }
  return metresBetween(place.coords, [position.lat, position.lng]);
}
