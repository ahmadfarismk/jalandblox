/**
 * Choosing which hand-written route card to show (task S4, docs/PLAN.md flow F4).
 *
 * "Take me there" does not work out a route: Danial writes about a dozen route
 * cards by hand, and the app picks the one whose starting point the visitor is
 * closest to.
 */

/** Where a route card starts when it does not start at a place, e.g. the airport. */
export const ARRIVAL_START = 'klia';

/**
 * The best route card to offer, or null when none was written for this place.
 *
 * With a position: the card starting nearest to the visitor. Without one (or
 * when every starting point is still missing its coordinates) we fall back to
 * `preferredFrom`, normally KL Sentral, because that is where the arrival
 * journey drops everyone off. Failing that, the first card written for the place.
 *
 * Cards that start at the airport are left out: the Arrival screen (S6) owns
 * that journey, and a tourist already in the city should never be sent back.
 *
 * @param {{id: string, from: string}[]} routes from getRoutesTo(placeId)
 * @param {Record<string, number|null>} distances metres to each place id
 * @param {string} [preferredFrom]
 */
export function pickRoute(routes, distances = {}, preferredFrom = 'kl-sentral') {
  const usable = routes.filter((route) => route.from !== ARRIVAL_START);
  if (usable.length === 0) return null;

  const measured = usable
    .map((route) => ({ route, metres: distances[route.from] }))
    .filter(({ metres }) => Number.isFinite(metres))
    .sort((a, b) => a.metres - b.metres);

  if (measured.length > 0) return measured[0].route;
  return usable.find((route) => route.from === preferredFrom) ?? usable[0];
}

/**
 * A Google Maps link to a place, for when we have no route card for it
 * (docs/PLAN.md flow F4). Route cards carry their own link, written by Danial;
 * this one is built from the place's own coordinates, so it holds no facts of
 * its own. Returns null when the coordinates are still TBC.
 *
 * @param {{coords?: [number, number]|null}} place from getPlace()
 */
export function googleMapsUrl(place) {
  const coords = place?.coords;
  if (!Array.isArray(coords) || coords.length !== 2 || !coords.every(Number.isFinite)) return null;
  const destination = `${coords[0]},${coords[1]}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=transit`;
}
