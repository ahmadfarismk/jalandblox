/**
 * Talks to the backend (Supabase send-postcard function).
 *
 * @typedef {{
 *   placeId: string, stars: number, text: string, email: string,
 *   nationality: string | null, lang: string, consent: boolean
 * }} Review
 * @typedef {{ ok: true, postcardQueued: boolean } | { ok: false, reason: string }} ReviewResult
 */
import { isMocked } from './useMocks';
import * as mock from './mocks/api.mock';
import * as real from './real/api.real';

const impl = isMocked('api') ? mock : real;

export const { submitReview } = impl;
