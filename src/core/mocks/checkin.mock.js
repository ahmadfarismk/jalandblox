/** FAKE check-in. Always succeeds with a gold stamp after 2 seconds. */
import { addStamp } from '../progress';
import { delay } from './delay';

/** @returns {Promise<{ result: import('../checkin').CheckinResult }>} */
export async function checkIn(placeId) {
  await delay(2000);
  addStamp(placeId, 'gold', 18);
  return { result: 'gold' };
}
