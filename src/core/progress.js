/**
 * Save and load the visitor's progress (stamps, journeys, reviews).
 * Screens import from here. This file only picks fake or real — see useMocks.js.
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
import { USE_MOCKS } from './useMocks';
import * as mock from './mocks/progress.mock';
import * as real from './real/progress.real';

const impl = USE_MOCKS ? mock : real;

export const {
  getProgress,
  markOpened,
  addStamp,
  getStamp,
  setJourneyStep,
  markReviewed,
  resetProgress,
  onProgressChange,
} = impl;
