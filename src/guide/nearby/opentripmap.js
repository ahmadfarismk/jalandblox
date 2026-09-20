/**
 * OpenTripMap: the second real source (task X2 spike).
 *
 * Same four exports as geoapify.js, returning the SAME shape, so nothing
 * above this file has to know which provider answered:
 *
 *   { id, name, category, group, lat, lng, distance_m }
 *
 * The endpoints, checked against dev.opentripmap.org/openapi.en.json on
 * 2026-09-21 (NOT from memory — three details differ from what we assumed):
 *
 *   Places near a point
 *     https://api.opentripmap.com/0.1/en/places/radius
 *       ?radius=<m>&lon=<lon>&lat=<lat>&limit=<n>&format=json
 *       &kinds=<comma separated>&rate=<1|2|3|1h|2h|3h>&apikey=<key>
 *
 *   Search by typed text
 *     https://api.opentripmap.com/0.1/en/places/autosuggest
 *       ?name=<typed>&radius=<m>&lon=<lon>&lat=<lat>
 *       &limit=<n>&format=json&apikey=<key>
 *
 * What differs from what we expected:
 *   1. autosuggest REQUIRES lat, lon and radius. There is no city-wide or
 *      country-wide search: every search is a circle around a point.
 *   2. `rate` is an enum of strings (1, 2, 3, 1h, 2h, 3h), not a number. The
 *      "h" means the place is on a cultural heritage list. It is a
 *      SIGNIFICANCE score for the place, never a visitor rating.
 *   3. `limit` defaults to 500 on radius and 10 on autosuggest, so we always
 *      send one.
 *
 * Free plan: 5,000 requests a day, 10 a second, non-commercial use only
 * (dev.opentripmap.org/price). Data is ODbL and may be cached and stored.
 *
 * The key comes from import.meta.env.VITE_OPENTRIPMAP_KEY. It never appears
 * in a thrown message, a log or the screen: `safeUrl` has it blanked.
 *
 * Failures throw an Error carrying a `reason` the screen can explain:
 *   no_key | needs_point | unsupported_group | network | bad_key |
 *   rate_limited | server | bad_answer | error
 */
import { metresBetween } from '@/core/geo';
import { groupForKinds, kindsFor, pickKind, splitKinds } from './categories';

const BASE = 'https://api.opentripmap.com/0.1/en/places';

/**
 * How far around the test point a typed search looks. OpenTripMap makes this
 * required, so there is no way to search all of Malaysia at once. 20 km
 * covers Kuala Lumpur and its suburbs from any point in the city.
 */
const SEARCH_RADIUS_M = 20000;

/** @returns {string} the key, or '' when nobody has set one. */
function apiKey() {
  return String(import.meta.env.VITE_OPENTRIPMAP_KEY ?? '').trim();
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
  return url.replace(/([?&]apikey=)[^&]*/, '$1***');
}

function num(value) {
  return Number.isFinite(value) ? value : null;
}

/**
 * How many requests have actually left the browser this session. Counted here
 * because this is the only place in this file that calls fetch.
 */
let sent = 0;

/** @returns {number} */
export function getSentCount() {
  return sent;
}

/**
 * One request. Everything that can go wrong comes back as a `reason`.
 * @param {string} url must already contain the apikey
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
    throw fail('network', 'Could not reach OpenTripMap. Check the connection.', safeUrl);
  }

  if (!response.ok) {
    const { status } = response;
    if (status === 401 || status === 403) {
      throw fail('bad_key', `OpenTripMap refused the key (HTTP ${status}).`, safeUrl);
    }
    if (status === 429) {
      throw fail('rate_limited', 'OpenTripMap says too many requests (HTTP 429).', safeUrl);
    }
    if (status >= 500) {
      throw fail('server', `OpenTripMap had a problem (HTTP ${status}).`, safeUrl);
    }
    throw fail('error', `OpenTripMap answered HTTP ${status}.`, safeUrl);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw fail('bad_answer', 'OpenTripMap sent something that is not JSON.', safeUrl);
  }

  // With format=json both endpoints answer with a plain array. Anything else
  // is an error object dressed up as a 200.
  if (!Array.isArray(body)) {
    const note = typeof body?.error === 'string' ? body.error : 'an unexpected answer';
    throw fail('bad_answer', `OpenTripMap sent ${note}.`, safeUrl);
  }
  return body;
}

/**
 * One OpenTripMap feature in our own shape.
 * @param {object} feature
 * @param {import('./categories').Group | null} group the group we asked for,
 *   or null to work it out from the feature's own kinds (a search does that)
 * @param {{lat: number, lng: number} | null} near
 */
function fromFeature(feature, group, near) {
  const lat = num(feature?.point?.lat);
  const lng = num(feature?.point?.lon);
  if (lat === null || lng === null) return null;

  const distance = num(feature.dist);
  const name = String(feature.name ?? '').trim();

  return {
    id: feature.xid ? `otm:${feature.xid}` : `otm:${lng},${lat}`,
    name: name || 'Unnamed place',
    category: pickKind(feature.kinds),
    group: group ?? groupForKinds(feature.kinds),
    lat,
    lng,
    distance_m:
      distance === null
        ? near
          ? metresBetween([lat, lng], [near.lat, near.lng])
          : null
        : Math.round(distance),
    // Debug-page extras, same as the Geoapify helper adds.
    address: null,
    allCategories: splitKinds(feature.kinds),
    // OpenTripMap's own significance score, 0 to 3. NOT a visitor rating:
    // the debug page must label it as significance and nothing else.
    significance: num(feature.rate) ?? null,
    wikidata: feature.wikidata ?? null,
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
 *
 * OpenTripMap requires a point and a radius for this, so `near` is NOT
 * optional here, unlike the Geoapify helper. Without one we fail with
 * `needs_point` rather than guessing a centre for Kuala Lumpur.
 *
 * @param {string} text
 * @param {{lat: number, lng: number} | null} [near]
 * @param {{limit?: number, signal?: AbortSignal}} [options]
 * @returns {Promise<Array<object>>}
 */
export async function searchPlaces(text, near = null, { limit = 10, signal } = {}) {
  const key = apiKey();
  if (!key) throw fail('no_key', 'No OpenTripMap key. Put VITE_OPENTRIPMAP_KEY in your .env.');

  const typed = String(text ?? '').trim();
  if (!typed) return [];
  // The API sets this minimum, not us.
  if (typed.length < 3) return [];
  if (!near || !Number.isFinite(near.lat) || !Number.isFinite(near.lng)) {
    throw fail(
      'needs_point',
      'OpenTripMap can only search around a point. Set a test point first.',
    );
  }

  const params = new URLSearchParams({
    name: typed,
    radius: String(SEARCH_RADIUS_M),
    lon: String(near.lng),
    lat: String(near.lat),
    limit: String(limit),
    format: 'json',
    apikey: key,
  });

  const body = await request(`${BASE}/autosuggest?${params}`, signal);
  return clean(body.map((feature) => fromFeature(feature, null, near)));
}

/**
 * Places near a point. Only the See group in this spike.
 * @param {object} options
 * @param {number} options.lat
 * @param {number} options.lng
 * @param {number} options.radius metres
 * @param {import('./categories').Group} options.group must be 'see'
 * @param {number} [options.limit]
 * @param {string} [options.rate] '', '1', '2', '3', '1h', '2h' or '3h'
 * @param {boolean} [options.wide] ask for all of interesting_places instead of
 *   our curated kinds, to show what the curated list leaves out
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Array<object>>} nearest first
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
}) {
  const key = apiKey();
  if (!key) throw fail('no_key', 'No OpenTripMap key. Put VITE_OPENTRIPMAP_KEY in your .env.');
  if (group !== 'see') {
    throw fail(
      'unsupported_group',
      `This spike only wired OpenTripMap up for See, not ${group}. ` +
        'It does have foods and accomodations branches, but we have not tested them.',
    );
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw fail('error', 'Nearby search needs a latitude and a longitude.');
  }

  const near = { lat, lng };
  const params = new URLSearchParams({
    radius: String(Math.round(radius)),
    lon: String(lng),
    lat: String(lat),
    limit: String(limit),
    format: 'json',
    kinds: kindsFor(group, { wide }),
    apikey: key,
  });
  // Leaving `rate` off means every rating, which is what the API does anyway.
  if (rate) params.set('rate', rate);

  const body = await request(`${BASE}/radius?${params}`, signal);
  return clean(body.map((feature) => fromFeature(feature, group, near))).sort(
    (a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity),
  );
}

/** True when a key is set. The screen uses it to explain the "no key" state. */
export function hasKey() {
  return apiKey() !== '';
}
