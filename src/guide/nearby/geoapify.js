/**
 * Geoapify: the ONLY file in the app that calls fetch (task X1 spike).
 *
 * It turns Geoapify's answers into a small shape of our own, so swapping the
 * provider later changes this one file and nothing else:
 *
 *   { id, name, category, group, lat, lng, distance_m }
 *
 * The two endpoints, taken from Geoapify's docs (2026-09-21):
 *
 *   Places near a point, by category
 *     https://api.geoapify.com/v2/places
 *       ?categories=<comma separated>
 *       &filter=circle:<lon>,<lat>,<radius_m>
 *       &bias=proximity:<lon>,<lat>
 *       &limit=20&apiKey=<key>
 *
 *   Search by typed text (Address Autocomplete)
 *     https://api.geoapify.com/v1/geocode/autocomplete
 *       ?text=<typed>
 *       &filter=countrycode:my
 *       &bias=proximity:<lon>,<lat>
 *       &limit=10&format=json&apiKey=<key>
 *
 * Geoapify puts LONGITUDE before LATITUDE in both `filter` and `bias`. That is
 * the opposite order to `coords` in places.json, so the swap happens here.
 *
 * The key comes from import.meta.env.VITE_GEOAPIFY_KEY. It never appears in a
 * thrown message, a log or the screen: `safeUrl` on an error has it blanked.
 *
 * Failures throw an Error carrying a `reason` the screen can explain:
 *   no_key | network | bad_key | rate_limited | server | bad_answer | error
 */
import { metresBetween } from '@/core/geo';
import { categoriesFor, groupForCategory, pickCategory } from './categories';

const PLACES_URL = 'https://api.geoapify.com/v2/places';
const AUTOCOMPLETE_URL = 'https://api.geoapify.com/v1/geocode/autocomplete';

/** Malaysia. Keeps a two-letter search like "kl" from landing in another country. */
const COUNTRY = 'my';

/** @returns {string} the key, or '' when nobody has set one. */
function apiKey() {
  return String(import.meta.env.VITE_GEOAPIFY_KEY ?? '').trim();
}

/** An error the screen can explain in plain English. */
function fail(reason, detail, safeUrl) {
  const error = new Error(detail ?? reason);
  error.reason = reason;
  if (safeUrl) error.safeUrl = safeUrl;
  return error;
}

/** The request URL with the key blanked out, safe to show on the debug page. */
function withoutKey(url) {
  return url.replace(/([?&]apiKey=)[^&]*/, '$1***');
}

/** Number, or null when the value is missing or nonsense. */
function num(value) {
  return Number.isFinite(value) ? value : null;
}

/**
 * How many requests have actually left the browser this session. Counted here
 * because this is the only place that calls fetch: a request refused earlier
 * (no key, no coordinates) costs nothing and must not be counted.
 */
let sent = 0;

/** @returns {number} */
export function getSentCount() {
  return sent;
}

/**
 * One request. Everything that can go wrong comes back as a `reason`.
 * @param {string} url must already contain the apiKey
 * @param {AbortSignal} [signal]
 */
async function request(url, signal) {
  const safeUrl = withoutKey(url);
  let response;
  sent += 1;
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw fail('network', 'Could not reach Geoapify. Check the connection.', safeUrl);
  }

  if (!response.ok) {
    const { status } = response;
    if (status === 401 || status === 403) {
      throw fail('bad_key', `Geoapify refused the key (HTTP ${status}).`, safeUrl);
    }
    if (status === 429) {
      throw fail('rate_limited', 'Geoapify says too many requests (HTTP 429).', safeUrl);
    }
    if (status >= 500) {
      throw fail('server', `Geoapify had a problem (HTTP ${status}).`, safeUrl);
    }
    throw fail('error', `Geoapify answered HTTP ${status}.`, safeUrl);
  }

  try {
    return await response.json();
  } catch {
    throw fail('bad_answer', 'Geoapify sent something that is not JSON.', safeUrl);
  }
}

/**
 * Geoapify's Places answer is GeoJSON: every place sits in feature.properties.
 * @param {object} feature
 * @param {import('./categories').Group} group
 * @param {{lat: number, lng: number} | null} near
 */
function fromFeature(feature, group, near) {
  const p = feature?.properties;
  if (!p) return null;
  const lat = num(p.lat);
  const lng = num(p.lon);
  if (lat === null || lng === null) return null;

  return {
    id: p.place_id ? `geoapify:${p.place_id}` : `geoapify:${lng},${lat}`,
    name: p.name || p.address_line1 || p.street || p.formatted || 'Unnamed place',
    category: pickCategory(p.categories, group),
    group,
    lat,
    lng,
    distance_m: num(p.distance) ?? (near ? metresBetween([lat, lng], [near.lat, near.lng]) : null),
    // Debug-page extras. Not part of the shape other screens would rely on.
    address: p.address_line2 || p.formatted || null,
    allCategories: Array.isArray(p.categories) ? [...p.categories] : [],
  };
}

/**
 * The Autocomplete answer with format=json is a flat `results` array.
 * A search is not asked group by group, so `group` is whatever the result's
 * own category maps to, or null when it is a street, an area or a shop.
 */
function fromResult(result, near) {
  const lat = num(result?.lat);
  const lng = num(result?.lon);
  if (lat === null || lng === null) return null;

  const category = result.category ?? null;
  return {
    id: result.place_id ? `geoapify:${result.place_id}` : `geoapify:${lng},${lat}`,
    name: result.name || result.address_line1 || result.formatted || 'Unnamed place',
    category: category ?? result.result_type ?? null,
    group: groupForCategory(category),
    lat,
    lng,
    distance_m:
      num(result.distance) ?? (near ? metresBetween([lat, lng], [near.lat, near.lng]) : null),
    address: result.address_line2 || result.formatted || null,
    allCategories: category ? [category] : [],
  };
}

/** Drops nulls and anything we have already seen. */
function clean(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/**
 * Search places by typed text.
 * @param {string} text what the visitor typed
 * @param {{lat: number, lng: number} | null} [near] point to prefer results around
 * @param {{limit?: number, signal?: AbortSignal}} [options]
 * @returns {Promise<Array<object>>}
 */
export async function searchPlaces(text, near = null, { limit = 10, signal } = {}) {
  const key = apiKey();
  if (!key) throw fail('no_key', 'No Geoapify key. Put VITE_GEOAPIFY_KEY in your .env.');

  const typed = String(text ?? '').trim();
  if (!typed) return [];

  const params = new URLSearchParams({
    text: typed,
    filter: `countrycode:${COUNTRY}`,
    limit: String(limit),
    format: 'json',
    apiKey: key,
  });
  // Geoapify wants lon,lat here, the opposite order to places.json.
  if (near) params.set('bias', `proximity:${near.lng},${near.lat}`);

  const body = await request(`${AUTOCOMPLETE_URL}?${params}`, signal);
  const results = Array.isArray(body?.results) ? body.results : [];
  return clean(results.map((r) => fromResult(r, near)));
}

/**
 * Places near a point, one group at a time.
 * @param {object} options
 * @param {number} options.lat
 * @param {number} options.lng
 * @param {number} options.radius metres
 * @param {import('./categories').Group} options.group 'see' | 'eat' | 'stay'
 * @param {number} [options.limit]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Array<object>>} nearest first
 */
export async function getNearbyPlaces({ lat, lng, radius, group, limit = 20, signal }) {
  const key = apiKey();
  if (!key) throw fail('no_key', 'No Geoapify key. Put VITE_GEOAPIFY_KEY in your .env.');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw fail('error', 'Nearby search needs a latitude and a longitude.');
  }

  const near = { lat, lng };
  const params = new URLSearchParams({
    categories: categoriesFor(group),
    // Geoapify wants lon,lat in both of these.
    filter: `circle:${lng},${lat},${Math.round(radius)}`,
    bias: `proximity:${lng},${lat}`,
    limit: String(limit),
    apiKey: key,
  });

  const body = await request(`${PLACES_URL}?${params}`, signal);
  const features = Array.isArray(body?.features) ? body.features : [];
  return clean(features.map((f) => fromFeature(f, group, near))).sort(
    (a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity),
  );
}

/** True when a key is set. The screen uses it to explain the "no key" state. */
export function hasKey() {
  return apiKey() !== '';
}
