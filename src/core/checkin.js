/**
 * Check-in rules (section 10 of docs/PLAN.md).
 *
 * @typedef {'gold' | 'too_far' | 'poor_signal' | 'no_permission' | 'error'} CheckinResult
 */
import { USE_MOCKS } from './useMocks';
import * as mock from './mocks/checkin.mock';
import * as real from './real/checkin.real';

const impl = USE_MOCKS ? mock : real;

export const { checkIn } = impl;
