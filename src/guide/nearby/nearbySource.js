/**
 * Which source answers the nearby-places spike (tasks X1 and X2), in the
 * style of src/core/useMocks.js. Fake is the default, so nobody spends
 * anyone's quota by accident and the debug page works with no key at all.
 *
 *   VITE_NEARBY_SOURCE=fake          (or missing) sample data, no network
 *   VITE_NEARBY_SOURCE=geoapify      the Geoapify API
 *   VITE_NEARBY_SOURCE=opentripmap   the OpenTripMap API
 *
 * It was called VITE_GEOAPIFY_SOURCE while Geoapify was the only provider.
 * That name is still read as a fallback so nobody's .env breaks, but
 * .env.example should now use VITE_NEARBY_SOURCE.
 *
 * The debug page can also flip it for the session without restarting, because
 * that is what a debug page is for. Nothing is saved: a reload goes back to
 * whatever .env says.
 *
 * This file also keeps both free plans safe:
 *   - every answer is cached per source, query, group and rate, so the same
 *     request never goes out twice in a session,
 *   - requests are spaced at least 250 ms apart, under the tighter of the two
 *     ceilings (Geoapify allows 5 a second, OpenTripMap 10),
 *   - it counts how many real requests the session has used, across both.
 *
 * Both providers allow results to be cached and stored: Geoapify with no
 * limits, OpenTripMap under ODbL.
 */
import * as fake from './geoapify.mock';
import * as geoapify from './geoapify';
import * as opentripmap from './opentripmap';
import { isGroup } from './categories';

export const SOURCES = ['fake', 'geoapify', 'opentripmap'];

/** The ones that really go out over the network. */
export const REAL_SOURCES = ['geoapify', 'opentripmap'];

const IMPLS = { fake, geoapify, opentripmap };

/** Which source .env asks for. */
export function defaultSource() {
  const asked =
    import.meta.env.VITE_NEARBY_SOURCE ??
    // The old name, from when Geoapify was the only provider.
    import.meta.env.VITE_GEOAPIFY_SOURCE ??
    'fake';
  const text = String(asked).trim().toLowerCase();
  return SOURCES.includes(text) ? text : 'fake';
}

function impl(source) {
  return IMPLS[source] ?? fake;
}

/** True when this source could actually answer (the real ones need a key). */
export function sourceReady(source) {
  return impl(source).hasKey();
}

/** True when this source goes out over the network. */
export function isRealSource(source) {
  return REAL_SOURCES.includes(source);
}

// --- Free-plan guards ------------------------------------------------------

/**
 * The tighter of the two ceilings is Geoapify's 5 requests a second
 * (OpenTripMap allows 10), so 250 ms is conservative for both.
 */
const MIN_GAP_MS = 250;

/** Cached answers, keyed by the exact question. Cleared only by clearCache(). */
const cache = new Map();

let nextSlotAt = 0;

/**
 * How many real requests this session has sent, across both providers. Each
 * provider counts next to its own fetch call, so a request that was refused
 * before it left the browser (no key, no point, wrong group) is not counted.
 */
export function getRequestCount() {
  return REAL_SOURCES.reduce((total, source) => total + IMPLS[source].getSentCount(), 0);
}

/** The same count, split by provider, for the debug page. */
export function getRequestCounts() {
  return Object.fromEntries(REAL_SOURCES.map((source) => [source, IMPLS[source].getSentCount()]));
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
    if (isRealSource(source)) await waitForSlot();
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
 *
 * `rate` and `wide` only mean anything to OpenTripMap. They are part of the
 * cache key regardless, so switching them always asks a fresh question.
 *
 * @param {{lat: number, lng: number, radius: number, group: string, limit?: number,
 *   rate?: string, wide?: boolean, signal?: AbortSignal, source: string}} options
 * @returns {Promise<NearbyAnswer>}
 */
export async function getNearbyPlaces({
  lat,
  lng,
  radius,
  group,
  limit = 20,
  rate = '',
  wide = false,
  signal,
  source,
}) {
  if (!isGroup(group)) {
    return asFailure(
      Object.assign(new Error(`Unknown group "${group}".`), { reason: 'error' }),
      source,
    );
  }
  const at = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const key = `nearby:${group}|${at}|${Math.round(radius)}|${limit}|${rate}|${wide ? 'wide' : 'curated'}`;
  return once(key, source, () =>
    impl(source).getNearbyPlaces({ lat, lng, radius, group, limit, rate, wide, signal }),
  );
}
