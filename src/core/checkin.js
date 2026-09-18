/**
 * Check-in rules (section 10 of docs/PLAN.md).
 *
 * checkIn(placeId) answers { result, distance_m?, accuracy_m? } where result is:
 *   gold          inside the radius with good GPS: a gold stamp was saved
 *   too_far       outside the radius (distance_m says how far)
 *   poor_signal   no GPS fix, or accuracy worse than 50 m
 *   no_permission location is turned off: offer "continue without GPS" (outline stamp)
 *   too_soon      a gold at another landmark less than 2 minutes ago (anti-cheat)
 *   error         anything else, e.g. the place has no coordinates yet
 *
 * @typedef {'gold' | 'too_far' | 'poor_signal' | 'no_permission' | 'too_soon' | 'error'} CheckinResult
 * @typedef {{ result: CheckinResult, distance_m?: number, accuracy_m?: number }} CheckinAnswer
 */
import { USE_MOCKS } from './useMocks';
import * as mock from './mocks/checkin.mock';
import * as real from './real/checkin.real';

const impl = USE_MOCKS ? mock : real;

export const { checkIn } = impl;
