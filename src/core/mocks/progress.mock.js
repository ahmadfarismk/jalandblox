/**
 * FAKE progress. Kept in memory only, so it resets when the page reloads.
 * Starts with a little sample data so screens have something to show:
 * one gold stamp, one outline stamp and one journey in progress.
 * The real version (task F4) saves to localStorage under 'jalankl-progress-v1'.
 */

/** @returns {import('../progress').Progress} */
function emptyProgress() {
  return {
    version: 1,
    prefs: { lang: 'en', nationality: null, startedFrom: null },
    opened: [],
    stamps: {},
    journeys: {},
    reviewed: [],
  };
}

function sampleProgress() {
  const p = emptyProgress();
  p.opened = ['abdul-samad', 'petaling-street'];
  p.stamps = {
    'abdul-samad': { kind: 'gold', at: '2026-10-03T02:42:00Z', accuracy_m: 18 },
    'petaling-street': { kind: 'outline', at: '2026-10-03T03:10:00Z' },
  };
  p.journeys = { 'kl-sentral__petronas': { stepIndex: 2 } };
  return p;
}

let state = sampleProgress();
const listeners = new Set();

function changed() {
  const snapshot = getProgress();
  listeners.forEach((cb) => cb(snapshot));
}

/** The whole progress object (a copy, so screens can't change it by accident). */
export function getProgress() {
  return structuredClone(state);
}

/** Adds an outline stamp if there is no stamp yet. */
export function markOpened(placeId) {
  if (!state.opened.includes(placeId)) state.opened.push(placeId);
  if (!state.stamps[placeId]) {
    state.stamps[placeId] = { kind: 'outline', at: new Date().toISOString() };
  }
  changed();
}

/** Gold never goes back to outline. Returns the stamp that is now saved. */
export function addStamp(placeId, kind, accuracy_m) {
  const existing = state.stamps[placeId];
  if (!(existing?.kind === 'gold' && kind === 'outline')) {
    const stamp = { kind, at: new Date().toISOString() };
    if (typeof accuracy_m === 'number') stamp.accuracy_m = accuracy_m;
    state.stamps[placeId] = stamp;
    changed();
  }
  return { ...state.stamps[placeId] };
}

/** @returns {null | { kind: 'outline' | 'gold', at: string }} */
export function getStamp(placeId) {
  const s = state.stamps[placeId];
  return s ? { kind: s.kind, at: s.at } : null;
}

export function setJourneyStep(routeId, stepIndex) {
  state.journeys[routeId] = { stepIndex };
  changed();
}

export function markReviewed(placeId) {
  if (!state.reviewed.includes(placeId)) state.reviewed.push(placeId);
  changed();
}

/** Clears everything back to an empty progress object (no sample data). */
export function resetProgress() {
  state = emptyProgress();
  changed();
}

/**
 * Calls `callback(progress)` whenever progress changes.
 * @returns {() => void} call it to stop listening (use in a useEffect cleanup)
 */
export function onProgressChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Not part of the shared contract. Used only by settings.mock.js.
export function _updatePrefs(changes) {
  state.prefs = { ...state.prefs, ...changes };
  changed();
  return { ...state.prefs };
}
