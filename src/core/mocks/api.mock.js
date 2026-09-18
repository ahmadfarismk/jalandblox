/** FAKE backend. Pretends the review was saved and the postcard email queued. */
import { delay } from './delay';

/**
 * @param {import('../api').Review} review
 * @returns {Promise<import('../api').ReviewResult>}
 */
export async function submitReview(review) {
  await delay(1000);
  console.info('[fake api] review received', review);
  return { ok: true, postcardQueued: true };
}
