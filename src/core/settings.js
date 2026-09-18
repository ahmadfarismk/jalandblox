/**
 * Language, nationality and other preferences.
 * Preferences are stored inside the progress object (progress.prefs).
 */
// Always the real version (since F4), for the same reason as progress.js.
export { getPrefs, setPrefs } from './real/settings.real';

// The languages the app has files for: [{ code, name }]
export { getLanguages } from './i18n';
