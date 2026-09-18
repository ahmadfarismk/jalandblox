/**
 * REAL progress. Saved on the phone in localStorage under 'jalankl-progress-v1'.
 *
 * Safety rules (docs/PLAN.md section 7):
 * - Every field has a default, so an empty, broken or older save never crashes the app.
 * - A broken save is copied to 'jalankl-progress-v1-broken' before it is replaced.
 * - If localStorage is blocked (e.g. some private browsing modes), progress still
 *   works in memory for this visit.
 * - We save GPS accuracy, never coordinates.
 */

export const STORAGE_KEY = 'jalankl-progress-v1';
const STAMP_KINDS = ['outline', 'gold'];
const STARTED_FROM = ['arrival', 'city'];

/** @returns {import('../progress').Progress} */
function emptyProgress(prefs) {
  return {
    version: 1,
    prefs: { lang: 'en', nationality: null, startedFrom: null, ...prefs },
    opened: [],
    stamps: {},
    journeys: {},
    reviewed: [],
  };
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const stringList = (v) =>
  Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string'))] : [];

/**
 * Turns anything (null, garbage, an older save) into a valid progress object.
 * @returns {import('../progress').Progress}
 */
export function normalise(raw) {
  const p = emptyProgress();
  if (!isObject(raw)) return p;

  if (isObject(raw.prefs)) {
    const { lang, nationality, startedFrom } = raw.prefs;
    if (typeof lang === 'string' && lang) p.prefs.lang = lang;
    if (typeof nationality === 'string' && nationality) p.prefs.nationality = nationality;
    if (STARTED_FROM.includes(startedFrom)) p.prefs.startedFrom = startedFrom;
  }

  p.opened = stringList(raw.opened);
  p.reviewed = stringList(raw.reviewed);

  if (isObject(raw.stamps)) {
    for (const [id, s] of Object.entries(raw.stamps)) {
      if (!isObject(s) || !STAMP_KINDS.includes(s.kind) || typeof s.at !== 'string') continue;
      const stamp = { kind: s.kind, at: s.at };
      if (Number.isFinite(s.accuracy_m)) stamp.accuracy_m = s.accuracy_m;
      p.stamps[id] = stamp;
    }
  }

  if (isObject(raw.journeys)) {
    for (const [id, j] of Object.entries(raw.journeys)) {
      if (isObject(j) && Number.isInteger(j.stepIndex) && j.stepIndex >= 0) {
        p.journeys[id] = { stepIndex: j.stepIndex };
      }
    }
  }

  return p;
}

// --- storage (every access is wrapped: localStorage can throw) ---

function readRaw(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeRaw(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Storage blocked or full: keep going in memory.
  }
}

function load() {
  const raw = readRaw(STORAGE_KEY);
  if (raw === null) return emptyProgress();
  try {
    return normalise(JSON.parse(raw));
  } catch {
    writeRaw(`${STORAGE_KEY}-broken`, raw);
    return emptyProgress();
  }
}

// --- state and listeners ---

/** @type {import('../progress').Progress | null} */
let state = null;
const listeners = new Set();
let watchingOtherTabs = false;

function current() {
  if (!state) state = load();
  return state;
}

function notify() {
  const snapshot = getProgress();
  listeners.forEach((cb) => cb(snapshot));
}

function save(next) {
  state = next;
  writeRaw(STORAGE_KEY, JSON.stringify(next));
  notify();
}

/** Keeps two open tabs of the app in step with each other. */
function watchOtherTabs() {
  if (watchingOtherTabs || typeof globalThis.addEventListener !== 'function') return;
  watchingOtherTabs = true;
  globalThis.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      state = load();
      notify();
    }
  });
}

// --- the shared contract (docs/PLAN.md section 8) ---

/** The whole progress object (a copy, so screens can't change it by accident). */
export function getProgress() {
  return structuredClone(current());
}

/** Records that the story was opened. Adds an outline stamp if there is no stamp yet. */
export function markOpened(placeId) {
  const next = structuredClone(current());
  if (!next.opened.includes(placeId)) next.opened.push(placeId);
  if (!next.stamps[placeId]) {
    next.stamps[placeId] = { kind: 'outline', at: new Date().toISOString() };
  }
  save(next);
}

/**
 * Adds a stamp. Gold is permanent: it never goes back to outline and keeps its
 * first date. Returns the stamp that is now saved.
 * @param {string} placeId
 * @param {'outline' | 'gold'} kind
 * @param {number} [accuracy_m]
 */
export function addStamp(placeId, kind, accuracy_m) {
  if (!STAMP_KINDS.includes(kind)) throw new Error(`addStamp: unknown kind "${kind}"`);
  const existing = current().stamps[placeId];
  const isUpgrade = !existing || (existing.kind === 'outline' && kind === 'gold');
  if (isUpgrade) {
    const next = structuredClone(current());
    const stamp = { kind, at: new Date().toISOString() };
    if (Number.isFinite(accuracy_m)) stamp.accuracy_m = Math.round(accuracy_m);
    next.stamps[placeId] = stamp;
    save(next);
  }
  return { ...current().stamps[placeId] };
}

/** @returns {null | { kind: 'outline' | 'gold', at: string }} */
export function getStamp(placeId) {
  const s = current().stamps[placeId];
  return s ? { kind: s.kind, at: s.at } : null;
}

export function setJourneyStep(routeId, stepIndex) {
  if (!Number.isInteger(stepIndex) || stepIndex < 0) return;
  const next = structuredClone(current());
  next.journeys[routeId] = { stepIndex };
  save(next);
}

export function markReviewed(placeId) {
  if (current().reviewed.includes(placeId)) return;
  const next = structuredClone(current());
  next.reviewed.push(placeId);
  save(next);
}

/** Clears stamps, journeys and reviews. Keeps preferences (language, nationality). */
export function resetProgress() {
  save(emptyProgress(current().prefs));
}

/**
 * Calls `callback(progress)` whenever progress changes, including from another tab.
 * @returns {() => void} call it to stop listening (use in a useEffect cleanup)
 */
export function onProgressChange(callback) {
  watchOtherTabs();
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Not part of the shared contract. Used only by settings.real.js.
export function _updatePrefs(changes) {
  const next = structuredClone(current());
  next.prefs = normalise({ prefs: { ...next.prefs, ...changes } }).prefs;
  save(next);
  return { ...next.prefs };
}
