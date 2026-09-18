/**
 * FAKE location. Always "stands" a few metres from Sultan Abdul Samad Building,
 * with good accuracy, after a short wait.
 */
import { getPlace } from '@/data';
import { metresBetween } from '../geo';
import { delay } from './delay';

// A few metres from the abdul-samad coords in places.json. Sample value only.
const FAKE_SPOT = { lat: 3.1488, lng: 101.6943, accuracy_m: 18 };

/** @returns {Promise<import('../location').Position>} */
export async function getPosition() {
  await delay(800);
  return { ok: true, ...FAKE_SPOT };
}

/**
 * Metres from `position` to the place, or null if the place has no coordinates yet.
 * @param {string} placeId
 * @param {{ lat: number, lng: number }} position
 */
export function distanceTo(placeId, position) {
  const place = getPlace(placeId);
  if (!place?.coords || !position) return null;
  return metresBetween(place.coords, [position.lat, position.lng]);
}
