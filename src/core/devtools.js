/**
 * Development helper: puts every core function on window.jalankl so you can
 * try them in the browser console, e.g.  await jalankl.checkIn('petronas')
 * Only runs in `npm run dev`, never in the built site.
 */
import * as progress from './progress';
import * as location from './location';
import * as checkin from './checkin';
import * as settings from './settings';
import * as api from './api';
import * as data from '@/data';
import { USE_MOCKS } from './useMocks';

/**
 * Replaces your saved progress with sample data: one gold stamp, one outline
 * stamp and a journey in progress. Handy when building the Passport or Map.
 */
function loadSampleProgress() {
  progress.resetProgress();
  progress.markOpened('petaling-street');
  progress.addStamp('abdul-samad', 'gold', 18);
  progress.setJourneyStep('kl-sentral__petronas', 2);
  return progress.getProgress();
}

export function installDevtools() {
  window.jalankl = {
    USE_MOCKS,
    ...progress,
    ...location,
    ...checkin,
    ...settings,
    ...api,
    ...data,
    loadSampleProgress,
  };
  console.info(`[JalanKL] ${USE_MOCKS ? 'FAKE' : 'REAL'} core functions ready: window.jalankl`);
}
