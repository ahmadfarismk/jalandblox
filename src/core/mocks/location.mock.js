/**
 * FAKE location. Always "stands" a few metres from Sultan Abdul Samad Building,
 * with good accuracy, after a short wait.
 */
import { getPlace } from '@/data';
import { distanceToPlace } from '../geo';
import { delay } from './delay';

// A few metres from the abdul-samad coords in places.json. Sample value only.
const FAKE_SPOT = { ok: true, lat: 3.1488, lng: 101.6943, accuracy_m: 18 };

/** @returns {Promise<import('../location').Position>} */
export async function getPosition() {
  await delay(800);
  return { ...FAKE_SPOT };
}

/** Metres from `position` to the place, or null if the place has no coordinates yet. */
export function distanceTo(placeId, position) {
  return distanceToPlace(getPlace(placeId), position);
}

/** Sends the fake spot now and every 3 seconds. Returns a function that stops it. */
export function watchPosition(callback) {
  const first = setTimeout(() => callback({ ...FAKE_SPOT }), 300);
  const repeat = setInterval(() => callback({ ...FAKE_SPOT }), 3000);
  return () => {
    clearTimeout(first);
    clearInterval(repeat);
  };
}

/** @returns {Promise<import('../location').PermissionState>} */
export async function getPermissionState() {
  return 'granted';
}
