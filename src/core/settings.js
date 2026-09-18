/**
 * Language, nationality and other preferences.
 * Preferences are stored inside the progress object (progress.prefs).
 */
import { USE_MOCKS } from './useMocks';
import * as mock from './mocks/settings.mock';
import * as real from './real/settings.real';

const impl = USE_MOCKS ? mock : real;

export const { getPrefs, setPrefs } = impl;
