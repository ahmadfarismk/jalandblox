/**
 * Fake vs real for the nearby-places spike (task X1), in the style of
 * src/core/useMocks.js. Fake is the default, so nobody spends credits by
 * accident and the debug page works with no key at all.
 *
 *   VITE_GEOAPIFY_SOURCE=fake       (or missing) sample data, no network
 *   VITE_GEOAPIFY_SOURCE=geoapify   the real API
 *
 * The debug page can also flip it for the session without restarting, because
 * that is what a debug page is for. Nothing is saved: a reload goes back to
 * whatever .env says.
 *
 * This file also keeps the free plan safe:
 *   - every answer is cached per query and group, so the same request never
 *     goes out twice in a session,
 *   - requests are spaced at least 250 ms apart, so we stay under 5 per second,
 *   - it counts how many real requests the session has used.
 *
 * Geoapify's terms allow results to be cached and stored with no limits.
 */
import * as fake from './geoapify.mock';
import * as real from './geoapify';
import { isGroup } from './categories';

export const SOURCES = ['fake', 'geoapify'];

/** Which source .env asks for. */
export function defaultSource() {
  const text = String(import.meta.env.VITE_GEOAPIFY_SOURCE ?? 'fake')
    .trim()
    .toLowerCase();
  return SOURCES.includes(text) ? text : 'fake';
}

function impl(source) {
  return source === 'geoapify' ? real : fake;
}

/** True when this source could actually answer (the real one needs a key). */
export function sourceReady(source) {
  return impl(source).hasKey();
}

// --- Free-plan guards ------------------------------------------------------

/** 5 requests/second is the free-plan ceiling, so we leave a little room. */
const MIN_GAP_MS = 250;

/** Cached answers, keyed by the exact question. Cleared only by clearCache(). */
const cache = new Map();

let nextSlotAt = 0;

/**
 * How many real requests this session has sent. Counted inside geoapify.js,
 * next to the one fetch call, so a request that was refused before it left the
 * browser (no key, no coordinates) is not counted.
 */
export function getRequestCount() {
  return real.getSentCount();
}

/** How many answers are being reused instead of asked again. */
export function getCacheSize() {
  return cache.size;
}

/** Forget every cached answer. The next question goes out again. */
export function clearCache() {
  cache.clear();
}

/** Waits until at least MIN_GAP_MS has passed since the last request started. */
async function waitForSlot() {
  const now = Date.now();
  const at = Math.max(now, nextSlotAt);
  nextSlotAt = at + MIN_GAP_MS;
  if (at > now) await new Promise((resolve) => setTimeout(resolve, at - now));
}

/** Turns anything thrown into the `{ ok: false, reason }` shape the screen shows. */
function asFailure(error, source) {
  return {
    ok: false,
    reason: error?.reason ?? 'error',
    detail: error?.message ?? String(error),
    safeUrl: error?.safeUrl ?? null,
    source,
  };
}

/**
 * Ask once, then remember the answer.
 * @param {string} key the cache key
 * @param {string} source
 * @param {() => Promise<Array<object>>} ask
 */
async function once(key, source, ask) {
  const cacheKey = `${source}|${key}`;
  if (cache.has(cacheKey)) {
    return { ok: true, items: cache.get(cacheKey), fromCache: true, source };
  }

  try {
    if (source === 'geoapify') await waitForSlot();
    const items = await ask();
    // Only good answers are kept, so a failure can always be tried again.
    cache.set(cacheKey, items);
    return { ok: true, items, fromCache: false, source };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    return asFailure(error, source);
  }
}

/**
 * @typedef {{ok: true, items: Array<object>, fromCache: boolean, source: string}
 *   | {ok: false, reason: string, detail: string, safeUrl: string|null, source: string}} NearbyAnswer
 */

/**
 * Search places by typed text.
 * @param {string} text
 * @param {{lat: number, lng: number}|null} near
 * @param {{source: string, limit?: number, signal?: AbortSignal}} options
 * @returns {Promise<NearbyAnswer>}
 */
export async function searchPlaces(text, near, { source, limit = 10, signal }) {
  const typed = String(text ?? '').trim();
  if (!typed) return { ok: true, items: [], fromCache: true, source };

  const at = near ? `${near.lat.toFixed(4)},${near.lng.toFixed(4)}` : 'nowhere';
  const key = `search:${typed.toLowerCase()}|${at}|${limit}`;
  return once(key, source, () => impl(source).searchPlaces(typed, near, { limit, signal }));
}

/**
 * Places near a point, one group at a time.
 * @param {{lat: number, lng: number, radius: number, group: string, limit?: number,
 *   signal?: AbortSignal, source: string}} options
 * @returns {Promise<NearbyAnswer>}
 */
export async function getNearbyPlaces({ lat, lng, radius, group, limit = 20, signal, source }) {
  if (!isGroup(group)) {
    return asFailure(
      Object.assign(new Error(`Unknown group "${group}".`), { reason: 'error' }),
      source,
    );
  }
  const key = `nearby:${group}|${lat.toFixed(4)},${lng.toFixed(4)}|${Math.round(radius)}|${limit}`;
  return once(key, source, () =>
    impl(source).getNearbyPlaces({ lat, lng, radius, group, limit, signal }),
  );
}
