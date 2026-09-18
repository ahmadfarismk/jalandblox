/**
 * REAL location, using the phone's GPS through the browser.
 *
 * Rules (docs/PLAN.md section 10):
 * - getPosition takes up to 3 readings over about 10 seconds and keeps the most accurate.
 * - watchPosition stops using GPS while the app is hidden, to save battery.
 * - Nothing here is saved. Positions only live in memory while a screen uses them.
 * - GPS only works on https (or localhost). Anywhere else we answer 'unavailable'.
 */
import { getPlace } from '@/data';
import { distanceToPlace } from '../geo';

const READINGS = 3;
const TIMEOUT_MS = 10_000;

function geolocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  if (globalThis.isSecureContext === false) return null;
  return navigator.geolocation;
}

/** Browser error codes: 1 = denied, 2 = no signal, 3 = took too long. */
function reasonFor(error) {
  return { 1: 'no_permission', 2: 'unavailable', 3: 'timeout' }[error?.code] ?? 'error';
}

function toPosition(p) {
  return {
    ok: true,
    lat: p.coords.latitude,
    lng: p.coords.longitude,
    accuracy_m: Math.round(p.coords.accuracy),
  };
}

/**
 * The most accurate of up to `readings` GPS readings taken within `timeoutMs`.
 * Screens that just need a rough position quickly can pass { readings: 1 }.
 * @param {{ readings?: number, timeoutMs?: number }} [options]
 * @returns {Promise<import('../location').Position>}
 */
export function getPosition({ readings = READINGS, timeoutMs = TIMEOUT_MS } = {}) {
  const geo = geolocation();
  if (!geo) return Promise.resolve({ ok: false, reason: 'unavailable' });

  return new Promise((resolve) => {
    let best = null;
    let count = 0;
    let done = false;
    let watchId = null;

    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (watchId !== null) geo.clearWatch(watchId);
      resolve(result);
    };

    const timer = setTimeout(() => finish(best ?? { ok: false, reason: 'timeout' }), timeoutMs);

    watchId = geo.watchPosition(
      (p) => {
        const reading = toPosition(p);
        if (!best || reading.accuracy_m < best.accuracy_m) best = reading;
        count += 1;
        if (count >= readings) finish(best);
      },
      (error) => {
        if (error?.code === 1) finish({ ok: false, reason: 'no_permission' });
        else finish(best ?? { ok: false, reason: reasonFor(error) });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
    );
    // In case it finished before watchPosition returned its id
    if (done) geo.clearWatch(watchId);
  });
}

/**
 * Metres from `position` to the place, or null if the place has no coordinates yet.
 * @param {string} placeId
 * @param {{ lat: number, lng: number }} position
 * @returns {number | null}
 */
export function distanceTo(placeId, position) {
  return distanceToPlace(getPlace(placeId), position);
}

/**
 * Live position for the Map and Guide home screens. Calls `callback(position)`
 * on every new reading, or `callback({ ok: false, reason })` on a problem.
 * GPS is switched off while the app is hidden and back on when it returns.
 * @param {(position: import('../location').Position) => void} callback
 * @returns {() => void} call it to stop (use in a useEffect cleanup)
 */
export function watchPosition(callback) {
  const geo = geolocation();
  if (!geo) {
    callback({ ok: false, reason: 'unavailable' });
    return () => {};
  }

  let watchId = null;
  const start = () => {
    if (watchId !== null) return;
    watchId = geo.watchPosition(
      (p) => callback(toPosition(p)),
      (error) => callback({ ok: false, reason: reasonFor(error) }),
      { enableHighAccuracy: true, maximumAge: 5_000 },
    );
  };
  const pause = () => {
    if (watchId === null) return;
    geo.clearWatch(watchId);
    watchId = null;
  };

  const doc = typeof document === 'undefined' ? null : document;
  const onVisibilityChange = () => (doc.hidden ? pause() : start());

  if (!doc?.hidden) start();
  doc?.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    pause();
    doc?.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

/**
 * Whether the visitor has already allowed location, without asking them.
 * 'prompt' means the phone will ask: show the explainer first.
 * @returns {Promise<import('../location').PermissionState>}
 */
export async function getPermissionState() {
  if (!geolocation()) return 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return ['granted', 'prompt', 'denied'].includes(status.state) ? status.state : 'unknown';
  } catch {
    return 'unknown';
  }
}
