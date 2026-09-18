/** REAL settings. Preferences live inside the saved progress (progress.prefs). */
import { getProgress, _updatePrefs } from './progress.real';

export function getPrefs() {
  return getProgress().prefs;
}

/** Merges `changes` into the preferences and returns the new preferences. */
export function setPrefs(changes) {
  return _updatePrefs(changes);
}
