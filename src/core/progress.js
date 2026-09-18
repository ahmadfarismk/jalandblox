/**
 * Save and load the visitor's progress (stamps, journeys, reviews).
 * Screens import from here.
 *
 * @typedef {'outline' | 'gold'} StampKind
 * @typedef {{ kind: StampKind, at: string, accuracy_m?: number }} Stamp
 * @typedef {{
 *   version: 1,
 *   prefs: { lang: string, nationality: string | null, startedFrom: 'arrival' | 'city' | null },
 *   opened: string[],
 *   stamps: Record<string, Stamp>,
 *   journeys: Record<string, { stepIndex: number }>,
 *   reviewed: string[]
 * }} Progress
 */
// Always the real version (since F4): it works everywhere, even with
// VITE_USE_MOCKS=true, and unlike the old fake it survives a reload.
// To get sample stamps while building screens, run jalankl.loadSampleProgress()
// in the browser console (see core/devtools.js).
export {
  getProgress,
  markOpened,
  addStamp,
  getStamp,
  setJourneyStep,
  markReviewed,
  resetProgress,
  onProgressChange,
} from './real/progress.real';
