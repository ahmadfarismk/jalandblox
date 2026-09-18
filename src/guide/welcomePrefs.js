/**
 * The small rules behind the Welcome screen (task S2, docs/PLAN.md flow F1).
 *
 * Kept out of the screen so they can be tested on their own and reused by any
 * screen that needs to know whether the visitor has been welcomed yet.
 */

/**
 * The answers to "Where are you now?", in the order they are shown.
 *
 * `value` is what core/settings.js saves as `prefs.startedFrom`. Only these two
 * values are accepted by the saving code, so they are not free text.
 */
export const START_CHOICES = [
  { value: 'arrival', key: 'welcome.start.arrival', label: 'Just landed' },
  { value: 'city', key: 'welcome.start.city', label: 'Already in KL' },
];

/**
 * Has the visitor finished the Welcome screen?
 *
 * The start choice is the test: language already has a default ('en') and
 * nationality may be skipped, so `startedFrom` is the only answer that is
 * empty until the visitor has actually chosen something.
 *
 * @param {{ startedFrom?: string | null } | null | undefined} prefs from getPrefs()
 */
export function isWelcomeDone(prefs) {
  return START_CHOICES.some((choice) => choice.value === prefs?.startedFrom);
}
