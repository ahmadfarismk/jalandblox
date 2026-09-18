/**
 * The rules behind the Journey screen (task S5, docs/PLAN.md flow F4).
 *
 * Kept out of the screen so they can be tested on their own.
 */

/**
 * Where a visitor is in a route card: the step they are on now, or the number
 * of steps once every step is done.
 *
 * A saved step from an older, longer version of a route card can point past
 * the end, so it is always clamped.
 *
 * @param {number|undefined} savedIndex from getProgress().journeys[routeId]
 * @param {number} stepCount
 */
export function currentStepIndex(savedIndex, stepCount) {
  if (!Number.isInteger(savedIndex) || savedIndex < 0) return 0;
  return Math.min(savedIndex, stepCount);
}

/**
 * What a step looks like right now: done, the one to do, or still to come.
 * @param {number} index
 * @param {number} current
 * @returns {'done'|'now'|'later'}
 */
export function stepState(index, current) {
  if (index < current) return 'done';
  if (index === current) return 'now';
  return 'later';
}

/**
 * What tapping "I'm Here" on a step should do.
 *
 * The last step of a route card carries `checkinPlace`, and that one opens the
 * GPS check-in instead of just ticking off (docs/PLAN.md change 19). Every
 * other step advances on the tap alone, because GPS is weak inside stations
 * and on trains.
 *
 * @param {{checkinPlace?: string}} step
 * @param {number} index
 * @returns {{ kind: 'checkin', to: string } | { kind: 'next', stepIndex: number }}
 */
export function imHereAction(step, index) {
  if (step?.checkinPlace) return { kind: 'checkin', to: `/checkin/${step.checkinPlace}` };
  return { kind: 'next', stepIndex: index + 1 };
}

/**
 * Is this journey over?
 *
 * Either every step is ticked off, or the visitor is on the last step and
 * already has a gold stamp for the place it ends at. That second case is the
 * normal one: the last step hands over to the Check-in screen, which never
 * comes back to tick the step off. An outline stamp does not count, because
 * opening a landmark's story gives one of those without going anywhere.
 *
 * @param {{checkinPlace?: string}[]} steps
 * @param {number} current from currentStepIndex()
 * @param {Record<string, {kind: string}>} stamps from getProgress().stamps
 */
export function isJourneyFinished(steps, current, stamps = {}) {
  if (current >= steps.length) return true;
  if (current !== steps.length - 1) return false;
  const placeId = steps[current]?.checkinPlace;
  return Boolean(placeId) && stamps[placeId]?.kind === 'gold';
}
