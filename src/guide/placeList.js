/**
 * The rules for showing a list of places (task S3, docs/PLAN.md flow F3).
 *
 * Kept out of the screen so they can be tested on their own. The Guide home,
 * the Map screen and the landmark detail all show distances the same way.
 */

/**
 * Places in the order to show them.
 *
 * With a position: nearest first. Without one, or for a place whose
 * coordinates are still TBC (`distanceTo()` answers null), we fall back to
 * Danial's suggested visiting order, and those places go last.
 *
 * @param {{id: string, order: number}[]} places from getPlaces()
 * @param {Record<string, number|null>} distances metres by place id, may be empty
 */
export function sortPlaces(places, distances = {}) {
  return [...places].sort((a, b) => {
    const da = distances[a.id];
    const db = distances[b.id];
    const aHas = Number.isFinite(da);
    const bHas = Number.isFinite(db);
    if (aHas && bHas) return da - db;
    if (aHas) return -1;
    if (bHas) return 1;
    return a.order - b.order;
  });
}

/**
 * A distance a tourist can read: metres up close, kilometres further away.
 * Returns null when we have no distance, so the screen shows nothing.
 *
 * @param {(key: string, options?: object) => string} t from useTranslation()
 * @param {number|null|undefined} metres
 */
export function formatDistance(t, metres) {
  if (!Number.isFinite(metres) || metres < 0) return null;
  if (metres < 1000) {
    // Round to 10 m: GPS is never exact, and "812 m away" pretends it is.
    return t('ui.metresAway', { count: Math.round(metres / 10) * 10 });
  }
  return t('ui.kmAway', { km: (metres / 1000).toFixed(1) });
}

/**
 * Which stamp picture a place gets: 'gold', 'outline' or 'none'.
 * @param {null | {kind: 'outline'|'gold'}} stamp from getStamp()
 */
export function stampKind(stamp) {
  return stamp?.kind === 'gold' || stamp?.kind === 'outline' ? stamp.kind : 'none';
}

/**
 * The locale key for a place's short name, e.g. "Petronas" instead of
 * "Petronas Twin Towers". Lists use it so a name still fits on a small phone.
 * Every place has one today; pass the full name as t()'s default in case one
 * is ever missing.
 *
 * @param {{id: string}} place
 */
export function shortNameKey(place) {
  return `places.${place.id}.short`;
}
