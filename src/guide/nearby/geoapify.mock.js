/**
 * FAKE nearby places (task X1 spike). Same two functions as geoapify.js, same
 * shape out, no network. This is the default so the debug page works with no
 * key and spends none of the 3,000 free credits.
 *
 * SAMPLE DATA, NOT RESEARCH. Every name ends with "(sample)" and every
 * coordinate is a small made-up offset from a real landmark in places.json, so
 * nothing here can be mistaken for a checked fact about Kuala Lumpur. Only
 * src/data/ holds real facts.
 */
import { metresBetween } from '@/core/geo';
import { delay } from '@/core/mocks/delay';
import { getPlace } from '@/data';
import { groupForCategory } from './categories';

// Centre of the fake city: the Sultan Abdul Samad coordinates from places.json,
// the same spot the fake GPS stands on.
const CENTRE = getPlace('abdul-samad')?.coords ?? [3.1488, 101.6943];

/** Moves a made-up number of metres off the centre. Sample positions only. */
function offset(northMetres, eastMetres) {
  const [lat, lng] = CENTRE;
  return {
    lat: lat + northMetres / 111320,
    lng: lng + eastMetres / (111320 * Math.cos((lat * Math.PI) / 180)),
  };
}

/** [name, category, metres north, metres east] */
const SAMPLES = [
  ['Old Town Museum (sample)', 'entertainment.museum', 120, -90],
  ['Riverside Heritage Walk (sample)', 'heritage', -180, 60],
  ['City Lookout Point (sample)', 'tourism.attraction', 640, 320],
  ['Padang Gardens (sample)', 'leisure.park', -420, -510],
  ['Clocktower Viewpoint (sample)', 'tourism.sights', 90, 140],

  ['Corner Kopitiam (sample)', 'catering.cafe', 70, 45],
  ['Riverbank Food Court (sample)', 'catering.food_court', -240, 130],
  ['Nasi Kandar House (sample)', 'catering.restaurant', 330, -210],
  ['Burger Stop (sample)', 'catering.fast_food', -95, 380],
  ['Second Floor Coffee (sample)', 'catering.cafe', 810, -640],
  ['Banana Leaf Corner (sample)', 'catering.restaurant', -720, 250],

  ['Heritage Row Hotel (sample)', 'accommodation.hotel', 200, 260],
  ['Backpackers Rest (sample)', 'accommodation.hostel', -310, -140],
  ['Jalan Tar Guest House (sample)', 'accommodation.guest_house', 470, 520],
  ['Station View Hotel (sample)', 'accommodation.hotel', -880, 410],
];

const PLACES = SAMPLES.map(([name, category, north, east], index) => {
  const { lat, lng } = offset(north, east);
  return {
    id: `fake:${index + 1}`,
    name,
    category,
    group: groupForCategory(category),
    lat,
    lng,
    address: 'Sample address, Kuala Lumpur',
    allCategories: [category],
  };
});

/**
 * Lets the debug page try the failure states without breaking anything real.
 * Set it to a reason ('network', 'bad_key', 'rate_limited', 'no_results', …)
 * and the next fake call behaves that way. null means behave normally.
 */
let forced = null;

/** @param {string|null} reason */
export function setFakeFailure(reason) {
  forced = reason || null;
}

/** @returns {string|null} */
export function getFakeFailure() {
  return forced;
}

function maybeFail() {
  if (!forced || forced === 'no_results') return;
  const error = new Error(`Pretend failure: ${forced}`);
  error.reason = forced;
  error.safeUrl = 'https://api.geoapify.com/… (fake, nothing was sent)';
  throw error;
}

function withDistance(place, near) {
  return {
    ...place,
    distance_m: near ? metresBetween([place.lat, place.lng], [near.lat, near.lng]) : null,
  };
}

/** Same signature as the real searchPlaces. */
export async function searchPlaces(text, near = null, { limit = 10 } = {}) {
  await delay(250);
  maybeFail();
  const typed = String(text ?? '')
    .trim()
    .toLowerCase();
  if (!typed) return [];
  if (forced === 'no_results') return [];

  return PLACES.filter((p) => p.name.toLowerCase().includes(typed))
    .map((p) => withDistance(p, near))
    .sort((a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity))
    .slice(0, limit);
}

/** Same signature as the real getNearbyPlaces. */
export async function getNearbyPlaces({ lat, lng, radius, group, limit = 20 }) {
  await delay(350);
  maybeFail();
  if (forced === 'no_results') return [];

  const near = { lat, lng };
  return PLACES.filter((p) => p.group === group)
    .map((p) => withDistance(p, near))
    .filter((p) => p.distance_m !== null && p.distance_m <= radius)
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, limit);
}

/** The fake never needs a key. */
export function hasKey() {
  return true;
}
