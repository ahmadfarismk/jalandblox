/**
 * REAL check-in. Reads GPS (best of 3), then applies the rules in
 * docs/PLAN.md section 10. Only a `gold` answer saves anything.
 */
import { getPlace } from '@/data';
import { addStamp, getProgress, getStamp } from '../progress';
import { distanceTo, getPosition } from './location.real';

/** GPS worse than this is not trusted (section 10: "50 m or better"). */
export const GOOD_ACCURACY_M = 50;
/** Ignore a gold less than this long after a gold at a different landmark. */
export const MIN_GAP_MS = 2 * 60 * 1000;

/** True if another landmark got a gold stamp less than 2 minutes ago. */
function goldElsewhereJustNow(placeId) {
  const now = Date.now();
  return Object.entries(getProgress().stamps).some(
    ([id, stamp]) =>
      id !== placeId && stamp.kind === 'gold' && now - Date.parse(stamp.at) < MIN_GAP_MS,
  );
}

/**
 * @param {string} placeId
 * @returns {Promise<import('../checkin').CheckinAnswer>}
 */
export async function checkIn(placeId) {
  try {
    const place = getPlace(placeId);
    // No coordinates yet (still TBC): we can't check, so don't ask for GPS.
    if (!place?.coords) return { result: 'error' };

    const position = await getPosition();
    if (!position.ok) {
      if (position.reason === 'no_permission') return { result: 'no_permission' };
      if (position.reason === 'error') return { result: 'error' };
      return { result: 'poor_signal' }; // unavailable or timeout
    }

    const { accuracy_m } = position;
    if (accuracy_m > GOOD_ACCURACY_M) return { result: 'poor_signal', accuracy_m };

    const distance_m = distanceTo(placeId, position);
    if (distance_m > place.radius_m) return { result: 'too_far', distance_m, accuracy_m };

    const alreadyGold = getStamp(placeId)?.kind === 'gold';
    if (!alreadyGold && goldElsewhereJustNow(placeId)) {
      return { result: 'too_soon', distance_m, accuracy_m };
    }

    addStamp(placeId, 'gold', accuracy_m);
    return { result: 'gold', distance_m, accuracy_m };
  } catch {
    return { result: 'error' };
  }
}
