/** FAKE settings. Reads and writes progress.prefs through the fake progress store. */
import { getProgress, _updatePrefs } from './progress.mock';

export function getPrefs() {
  return getProgress().prefs;
}

/** Merges `changes` into the preferences and returns the new preferences. */
export function setPrefs(changes) {
  return _updatePrefs(changes);
}
