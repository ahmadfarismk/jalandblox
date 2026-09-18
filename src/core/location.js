/**
 * GPS reading and distance check.
 *
 * @typedef {{ ok: true, lat: number, lng: number, accuracy_m: number }
 *   | { ok: false, reason: 'no_permission' | 'unavailable' | 'timeout' | 'error' }} Position
 */
import { USE_MOCKS } from './useMocks';
import * as mock from './mocks/location.mock';
import * as real from './real/location.real';

const impl = USE_MOCKS ? mock : real;

export const { getPosition, distanceTo } = impl;
