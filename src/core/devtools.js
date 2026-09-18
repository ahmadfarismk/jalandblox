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

export function installDevtools() {
  window.jalankl = {
    USE_MOCKS,
    ...progress,
    ...location,
    ...checkin,
    ...settings,
    ...api,
    ...data,
  };
  console.info(`[JalanKL] ${USE_MOCKS ? 'FAKE' : 'REAL'} core functions ready: window.jalankl`);
}
