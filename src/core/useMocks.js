/**
 * The one place that decides fake vs real, per part of the app.
 *
 * VITE_USE_MOCKS in .env (or .env.production for the live site) can be:
 *   true               every switchable part is fake (the default when it is missing)
 *   false              every part is real
 *   api                only the listed parts are fake, the rest are real.
 *   location,checkin   Separate names with commas.
 *
 * The parts: location (GPS), checkin (check-in rules), api (sending reviews).
 * Progress and settings are always real (see progress.js).
 */

export const MOCKABLE_PARTS = ['location', 'checkin', 'api'];

/**
 * Turns the VITE_USE_MOCKS text into the set of parts that stay fake.
 * @param {string | undefined} value
 * @returns {Set<string>}
 */
export function parseMockSetting(value) {
  const text = String(value ?? 'true')
    .trim()
    .toLowerCase();
  if (text === '' || text === 'true') return new Set(MOCKABLE_PARTS);
  if (text === 'false') return new Set();

  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const unknown = parts.filter((part) => !MOCKABLE_PARTS.includes(part));
  if (unknown.length) {
    console.warn(
      `[JalanKL] VITE_USE_MOCKS: unknown part(s) ${unknown.join(', ')}. ` +
        `Use true, false or a list of: ${MOCKABLE_PARTS.join(', ')}.`,
    );
  }
  return new Set(parts.filter((part) => MOCKABLE_PARTS.includes(part)));
}

/** The parts using fakes in this build. */
export const MOCKED_PARTS = parseMockSetting(import.meta.env.VITE_USE_MOCKS);

/** True if this part of the app uses its fake version. */
export function isMocked(part) {
  return MOCKED_PARTS.has(part);
}

/** True if any part is fake. */
export const USE_MOCKS = MOCKED_PARTS.size > 0;
