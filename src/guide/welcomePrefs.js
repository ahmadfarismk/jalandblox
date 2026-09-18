/**
 * The small rules behind the Welcome screen (task S2, docs/PLAN.md flow F1).
 *
 * Kept out of the screen so they can be tested on their own and reused by any
 * screen that needs to know whether the visitor has been welcomed yet.
 */
import { getNationalities } from '@/data';

/**
 * The answers to "Where are you now?", in the order they are shown.
 *
 * `value` is what core/settings.js saves as `prefs.startedFrom`. Only these two
 * values are accepted by the saving code, so they are not free text.
 */
export const START_CHOICES = [
  {
    value: 'arrival',
    key: 'welcome.start.arrival',
    label: 'Just landed',
    hintKey: 'welcome.start.arrivalHint',
    hint: 'At KLIA and heading into the city',
  },
  {
    value: 'city',
    key: 'welcome.start.city',
    label: 'Already in KL',
    hintKey: 'welcome.start.cityHint',
    hint: 'Show me the landmarks',
  },
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

/** The country's name in `lang`, or the code itself if the phone can't name it. */
function countryName(display, code) {
  try {
    return display?.of(code) || code;
  } catch {
    return code;
  }
}

/**
 * The countries for the nationality picker, named in the visitor's own
 * language and sorted the way that language sorts.
 *
 * Danial's getNationalities() gives ISO 3166 country codes only (task D1), and
 * the phone turns each code into a name, so country names never need a
 * translation file. We save the code, not the name.
 *
 * @param {string} lang a language code, e.g. 'en' or 'ms'
 * @returns {{ code: string, name: string }[]}
 */
export function countryOptions(lang) {
  let display = null;
  try {
    display = new Intl.DisplayNames([lang], { type: 'region' });
  } catch {
    // Very old phone: fall back to showing the codes.
  }

  const options = getNationalities().map((code) => ({ code, name: countryName(display, code) }));

  try {
    const collator = new Intl.Collator(lang);
    options.sort((a, b) => collator.compare(a.name, b.name));
  } catch {
    options.sort((a, b) => a.name.localeCompare(b.name));
  }

  return options;
}
